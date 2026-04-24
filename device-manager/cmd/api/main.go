package main

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/nats-io/nats.go"
)

type app struct {
	db   *sql.DB
	nats *nats.Conn
}

type templateField struct {
	FieldID   string `json:"field_id,omitempty"`
	FieldName string `json:"field_name"`
	FieldType string `json:"field_type"`
	Required  bool   `json:"required"`
}

type templateRequest struct {
	TemplateName string          `json:"template_name"`
	Description  string          `json:"description"`
	CreatedBy    string          `json:"created_by"`
	Fields       []templateField `json:"fields"`
}

type deviceRequest struct {
	CreatedBy   string `json:"created_by"`
	DeviceName  string `json:"device_name"`
	TemplateID  string `json:"template_id"`
	MQTTTopic   string `json:"mqtt_topic"`
	DeviceState string `json:"device_status"`
}

func main() {
	ctx := context.Background()

	db, err := sql.Open("pgx", requiredEnv("DATABASE_URL"))
	if err != nil {
		log.Fatalf("open database: %v", err)
	}
	defer db.Close()

	if err := db.PingContext(ctx); err != nil {
		log.Fatalf("ping database: %v", err)
	}

	nc, err := nats.Connect(env("NATS_URL", nats.DefaultURL))
	if err != nil {
		log.Fatalf("connect nats: %v", err)
	}
	defer nc.Close()

	a := &app{db: db, nats: nc}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", a.health)
	mux.HandleFunc("POST /templates", a.createTemplate)
	mux.HandleFunc("GET /templates", a.listTemplates)
	mux.HandleFunc("POST /devices", a.createDevice)
	mux.HandleFunc("GET /devices", a.listDevices)

	port := env("HTTP_PORT", "3001")
	log.Printf("device-manager listening on :%s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}

func (a *app) health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (a *app) createTemplate(w http.ResponseWriter, r *http.Request) {
	var input templateRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	if input.TemplateName == "" || input.CreatedBy == "" {
		writeError(w, http.StatusBadRequest, errors.New("template_name and created_by are required"))
		return
	}

	ctx := r.Context()
	tx, err := a.db.BeginTx(ctx, nil)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	defer tx.Rollback()

	var templateID string
	err = tx.QueryRowContext(ctx, `
		INSERT INTO device_manager.device_templates (template_name, description, created_by)
		VALUES ($1, $2, $3)
		RETURNING template_id::text
	`, input.TemplateName, input.Description, input.CreatedBy).Scan(&templateID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	for i := range input.Fields {
		field := input.Fields[i]
		if field.FieldName == "" || field.FieldType == "" {
			writeError(w, http.StatusBadRequest, errors.New("field_name and field_type are required"))
			return
		}
		err = tx.QueryRowContext(ctx, `
			INSERT INTO device_manager.template_fields (template_id, field_name, field_type, required)
			VALUES ($1, $2, $3, $4)
			RETURNING field_id::text
		`, templateID, field.FieldName, strings.ToLower(field.FieldType), field.Required).Scan(&input.Fields[i].FieldID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}
	}

	if err := tx.Commit(); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	event := map[string]any{
		"event_id":    newEventID(),
		"event_type":  "template.created",
		"template_id": templateID,
		"user_id":     input.CreatedBy,
		"timestamp":   time.Now().UTC().Format(time.RFC3339),
		"fields":      templateEventFields(input.Fields),
	}
	a.publish("template.created", event)

	writeJSON(w, http.StatusCreated, map[string]any{
		"template_id":   templateID,
		"template_name": input.TemplateName,
		"description":   input.Description,
		"created_by":    input.CreatedBy,
		"fields":        input.Fields,
	})
}

func (a *app) listTemplates(w http.ResponseWriter, r *http.Request) {
	createdBy := r.URL.Query().Get("created_by")
	if createdBy == "" {
		writeError(w, http.StatusBadRequest, errors.New("created_by query parameter is required"))
		return
	}

	rows, err := a.db.QueryContext(r.Context(), `
		SELECT template_id::text, template_name, COALESCE(description, ''), created_by::text
		FROM device_manager.device_templates
		WHERE created_by = $1
		ORDER BY created_at DESC
	`, createdBy)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	defer rows.Close()

	var items []map[string]any
	for rows.Next() {
		var id, name, description, owner string
		if err := rows.Scan(&id, &name, &description, &owner); err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}
		items = append(items, map[string]any{
			"template_id":   id,
			"template_name": name,
			"description":   description,
			"created_by":    owner,
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": items})
}

func (a *app) createDevice(w http.ResponseWriter, r *http.Request) {
	var input deviceRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	if input.CreatedBy == "" || input.DeviceName == "" || input.TemplateID == "" {
		writeError(w, http.StatusBadRequest, errors.New("created_by, device_name and template_id are required"))
		return
	}
	deviceID := newEventID()
	if input.MQTTTopic == "" {
		input.MQTTTopic = "gateway.data/" + deviceID
	}
	if input.DeviceState == "" {
		input.DeviceState = "OFFLINE"
	}

	err := a.db.QueryRowContext(r.Context(), `
		INSERT INTO device_manager.devices (device_id, user_id, template_id, device_name, device_status, mqtt_topic)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING device_id::text
	`, deviceID, input.CreatedBy, input.TemplateID, input.DeviceName, strings.ToUpper(input.DeviceState), input.MQTTTopic).Scan(&deviceID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	event := map[string]any{
		"event_id":   newEventID(),
		"event_type": "device.created",
		"device_id":  deviceID,
		"user_id":    input.CreatedBy,
		"timestamp":  time.Now().UTC().Format(time.RFC3339),
		"data": map[string]any{
			"template_id":   input.TemplateID,
			"device_name":   input.DeviceName,
			"device_status": strings.ToUpper(input.DeviceState),
			"mqtt_topic":    input.MQTTTopic,
		},
	}
	a.publish("device.created", event)

	writeJSON(w, http.StatusCreated, map[string]any{
		"device_id":     deviceID,
		"user_id":       input.CreatedBy,
		"template_id":   input.TemplateID,
		"device_name":   input.DeviceName,
		"device_status": strings.ToUpper(input.DeviceState),
		"mqtt_topic":    input.MQTTTopic,
	})
}

func (a *app) listDevices(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		writeError(w, http.StatusBadRequest, errors.New("user_id query parameter is required"))
		return
	}

	rows, err := a.db.QueryContext(r.Context(), `
		SELECT device_id::text, user_id::text, template_id::text, device_name, device_status, mqtt_topic
		FROM device_manager.devices
		WHERE user_id = $1
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	defer rows.Close()

	var items []map[string]any
	for rows.Next() {
		var id, owner, templateID, name, status, topic string
		if err := rows.Scan(&id, &owner, &templateID, &name, &status, &topic); err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}
		items = append(items, map[string]any{
			"device_id":     id,
			"user_id":       owner,
			"template_id":   templateID,
			"device_name":   name,
			"device_status": status,
			"mqtt_topic":    topic,
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": items})
}

func (a *app) publish(subject string, payload any) {
	body, err := json.Marshal(payload)
	if err != nil {
		log.Printf("marshal nats event: %v", err)
		return
	}
	if err := a.nats.Publish(subject, body); err != nil {
		log.Printf("publish nats event %s: %v", subject, err)
	}
	if err := a.nats.FlushTimeout(2 * time.Second); err != nil {
		log.Printf("flush nats event %s: %v", subject, err)
	}
}

func templateEventFields(fields []templateField) []map[string]any {
	out := make([]map[string]any, 0, len(fields))
	for _, field := range fields {
		out = append(out, map[string]any{
			"name":     field.FieldName,
			"type":     strings.ToLower(field.FieldType),
			"required": field.Required,
		})
	}
	return out
}

func decodeJSON(r *http.Request, out any) error {
	defer r.Body.Close()
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	return decoder.Decode(out)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		log.Printf("write json: %v", err)
	}
}

func writeError(w http.ResponseWriter, status int, err error) {
	writeJSON(w, status, map[string]string{"error": err.Error()})
}

func env(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}

func requiredEnv(key string) string {
	value := os.Getenv(key)
	if value == "" {
		log.Fatalf("%s is required", key)
	}
	return value
}

func newEventID() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		log.Printf("generate uuid: %v", err)
		return "00000000-0000-4000-8000-000000000000"
	}
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}
