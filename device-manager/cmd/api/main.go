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
	"github.com/golang-jwt/jwt/v5"
	"github.com/redis/go-redis/v9"
)

type contextKey string

const (
	tenantIDKey contextKey = "tenant_id"
	userIDKey   contextKey = "user_id"
)

type app struct {
	db        *sql.DB
	nats      *nats.Conn
	redis     *redis.Client
	jwtPubKey []byte
}

type TokenData struct {
	UserID   string `json:"user_id"`
	TenantID string `json:"tenant_id"`
}

type templateField struct {
	FieldID  string `json:"field_id,omitempty"`
	Name     string `json:"name"`
	Type     string `json:"type"`
	Required bool   `json:"required"`
}

type templateRequest struct {
	Name        string          `json:"name"`
	Description string          `json:"description"`
	Fields      []templateField `json:"fields"`
}

type deviceRequest struct {
	DeviceName  string `json:"device_name"`
	TemplateID  string `json:"template_id"`
	MQTTTopic   string `json:"mqtt_topic"`
	DeviceState string `json:"device_status"`
}

type actuatorRequest struct {
	Name          string         `json:"name"`
	CommandTopic  string         `json:"command_topic"`
	PayloadSchema map[string]any `json:"payload_schema"`
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

	rdb := redis.NewClient(&redis.Options{
		Addr: env("REDIS_ADDR", "redis:6379"),
	})
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatalf("connect redis: %v", err)
	}

	pubKeyPath := env("JWT_PUBLIC_KEY_PATH", "public_key.pem")
	pubKey, err := os.ReadFile(pubKeyPath)
	if err != nil {
		log.Printf("warning: could not read JWT public key from %s: %v", pubKeyPath, err)
	}

	a := &app{db: db, nats: nc, redis: rdb, jwtPubKey: pubKey}

	// Sincronizar dispositivos existentes para o Redis
	if err := a.syncDevicesToRedis(ctx); err != nil {
		log.Printf("error syncing devices to redis: %v", err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", a.health)
	mux.Handle("POST /templates", a.authMiddleware(http.HandlerFunc(a.createTemplate)))
	mux.Handle("GET /templates", a.authMiddleware(http.HandlerFunc(a.listTemplates)))
	mux.Handle("POST /devices", a.authMiddleware(http.HandlerFunc(a.createDevice)))
	mux.Handle("GET /devices", a.authMiddleware(http.HandlerFunc(a.listDevices)))
	mux.Handle("POST /devices/{id}/actuators", a.authMiddleware(http.HandlerFunc(a.createActuator)))
	mux.Handle("GET /devices/{id}/actuators", a.authMiddleware(http.HandlerFunc(a.listActuators)))

	port := env("HTTP_PORT", "3001")
	log.Printf("device-manager listening on :%s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}

func (a *app) authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		log.Printf("DEBUG: Received Auth Header: [%s]", authHeader)
		if authHeader == "" {
			writeError(w, http.StatusUnauthorized, errors.New("missing authorization header"))
			return
		}

		if !strings.HasPrefix(authHeader, "Bearer ") {
			writeError(w, http.StatusUnauthorized, errors.New("invalid authorization header format"))
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		tokenString = strings.TrimSpace(tokenString)

		if tokenString == "" {
			writeError(w, http.StatusUnauthorized, errors.New("missing token"))
			return
		}
		key, err := jwt.ParseRSAPublicKeyFromPEM(a.jwtPubKey)
		if err != nil {
			writeError(w, http.StatusInternalServerError, errors.New("failed to parse public key"))
			return
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return key, nil
		})

		if err != nil || !token.Valid {
			writeError(w, http.StatusUnauthorized, errors.New("invalid token"))
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			writeError(w, http.StatusUnauthorized, errors.New("invalid token claims"))
			return
		}

		data, ok := claims["data"].(map[string]any)
		if !ok {
			writeError(w, http.StatusUnauthorized, errors.New("missing data in token claims"))
			return
		}

		userID, _ := data["user_id"].(string)
		tenantID, _ := data["tenant_id"].(string)

		if userID == "" || tenantID == "" {
			writeError(w, http.StatusUnauthorized, errors.New("invalid token data"))
			return
		}

		ctx := context.WithValue(r.Context(), userIDKey, userID)
		ctx = context.WithValue(ctx, tenantIDKey, tenantID)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
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
	if input.Name == "" {
		writeError(w, http.StatusBadRequest, errors.New("name is required"))
		return
	}

	ctx := r.Context()
	userID := ctx.Value(userIDKey).(string)
	tenantID := ctx.Value(tenantIDKey).(string)

	tx, err := a.db.BeginTx(ctx, nil)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	defer tx.Rollback()

	var templateID string
	err = tx.QueryRowContext(ctx, `
		INSERT INTO device_manager.device_templates (template_name, description, created_by, tenant_id)
		VALUES ($1, $2, $3, $4)
		RETURNING template_id::text
	`, input.Name, input.Description, userID, tenantID).Scan(&templateID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	for i := range input.Fields {
		field := input.Fields[i]
		if field.Name == "" || field.Type == "" {
			writeError(w, http.StatusBadRequest, errors.New("name and type are required"))
			return
		}
		err = tx.QueryRowContext(ctx, `
			INSERT INTO device_manager.template_fields (template_id, field_name, field_type, required)
			VALUES ($1, $2, $3, $4)
			RETURNING field_id::text
		`, templateID, field.Name, strings.ToLower(field.Type), field.Required).Scan(&input.Fields[i].FieldID)
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
		"user_id":     userID,
		"tenant_id":   tenantID,
		"timestamp":   time.Now().UTC().Format(time.RFC3339),
		"fields":      templateEventFields(input.Fields),
	}
	a.publish("template.created", event)

	writeJSON(w, http.StatusCreated, map[string]any{
		"template_id":   templateID,
		"name":          input.Name,
		"description":   input.Description,
		"tenant_id":     tenantID,
		"fields":        input.Fields,
	})
}

func (a *app) listTemplates(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Context().Value(tenantIDKey).(string)

	rows, err := a.db.QueryContext(r.Context(), `
		SELECT template_id::text, template_name, COALESCE(description, ''), created_by::text, tenant_id::text
		FROM device_manager.device_templates
		WHERE tenant_id = $1
		ORDER BY created_at DESC
	`, tenantID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	defer rows.Close()

	var items []map[string]any
	for rows.Next() {
		var id, name, description, owner, tenant string
		if err := rows.Scan(&id, &name, &description, &owner, &tenant); err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}
		items = append(items, map[string]any{
			"template_id":   id,
			"name":          name,
			"description":   description,
			"created_by":    owner,
			"tenant_id":     tenant,
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
	if input.DeviceName == "" || input.TemplateID == "" {
		writeError(w, http.StatusBadRequest, errors.New("device_name and template_id are required"))
		return
	}

	ctx := r.Context()
	userID := ctx.Value(userIDKey).(string)
	tenantID := ctx.Value(tenantIDKey).(string)

	deviceID := newEventID()
	if input.MQTTTopic == "" {
		input.MQTTTopic = "gateway.data/" + deviceID
	}
	if input.DeviceState == "" {
		input.DeviceState = "OFFLINE"
	}

	err := a.db.QueryRowContext(ctx, `
		INSERT INTO device_manager.devices (device_id, user_id, template_id, device_name, device_status, mqtt_topic, tenant_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING device_id::text
	`, deviceID, userID, input.TemplateID, input.DeviceName, strings.ToUpper(input.DeviceState), input.MQTTTopic, tenantID).Scan(&deviceID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	// Salvar no Redis para enriquecimento de dados
	redisKey := fmt.Sprintf("device:%s", deviceID)
	redisData := map[string]interface{}{
		"tenant_id":   tenantID,
		"template_id": input.TemplateID,
	}
	encoded, _ := json.Marshal(redisData)
	a.redis.Set(ctx, redisKey, encoded, 0)

	event := map[string]any{
		"event_id":   newEventID(),
		"event_type": "device.created",
		"device_id":  deviceID,
		"user_id":    userID,
		"tenant_id":  tenantID,
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
		"template_id":   input.TemplateID,
		"device_name":   input.DeviceName,
		"device_status": strings.ToUpper(input.DeviceState),
		"mqtt_topic":    input.MQTTTopic,
		"tenant_id":     tenantID,
	})
}

func (a *app) listDevices(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Context().Value(tenantIDKey).(string)

	rows, err := a.db.QueryContext(r.Context(), `
		SELECT d.device_id::text, d.user_id::text, d.template_id::text, d.device_name, d.device_status, d.mqtt_topic, d.tenant_id::text, t.template_name
		FROM device_manager.devices d
		LEFT JOIN device_manager.device_templates t ON d.template_id = t.template_id
		WHERE d.tenant_id = $1
		ORDER BY d.created_at DESC
	`, tenantID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	defer rows.Close()

	var items []map[string]any
	for rows.Next() {
		var id, owner, templateID, name, status, topic, tenant, templateName string
		if err := rows.Scan(&id, &owner, &templateID, &name, &status, &topic, &tenant, &templateName); err != nil {
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
			"tenant_id":     tenant,
			"template_name": templateName,
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": items})
}

func (a *app) createActuator(w http.ResponseWriter, r *http.Request) {
	deviceID := r.PathValue("id")
	if deviceID == "" {
		writeError(w, http.StatusBadRequest, errors.New("device id is required"))
		return
	}

	var input actuatorRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	if input.Name == "" || input.CommandTopic == "" {
		writeError(w, http.StatusBadRequest, errors.New("name and command_topic are required"))
		return
	}

	ctx := r.Context()
	tenantID := ctx.Value(tenantIDKey).(string)

	// Verificar se o device pertence ao tenant
	var exists bool
	err := a.db.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM device_manager.devices WHERE device_id = $1 AND tenant_id = $2)", deviceID, tenantID).Scan(&exists)
	if err != nil || !exists {
		writeError(w, http.StatusNotFound, errors.New("device not found or access denied"))
		return
	}

	var actuatorID string
	schemaRaw, _ := json.Marshal(input.PayloadSchema)
	err = a.db.QueryRowContext(ctx, `
		INSERT INTO device_manager.actuators (device_id, name, command_topic, payload_schema)
		VALUES ($1, $2, $3, $4)
		RETURNING actuator_id::text
	`, deviceID, input.Name, input.CommandTopic, schemaRaw).Scan(&actuatorID)

	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"actuator_id":   actuatorID,
		"device_id":     deviceID,
		"name":          input.Name,
		"command_topic": input.CommandTopic,
	})
}

func (a *app) listActuators(w http.ResponseWriter, r *http.Request) {
	deviceID := r.PathValue("id")
	tenantID := r.Context().Value(tenantIDKey).(string)

	rows, err := a.db.QueryContext(r.Context(), `
		SELECT a.actuator_id::text, a.name, a.command_topic, a.payload_schema
		FROM device_manager.actuators a
		JOIN device_manager.devices d ON a.device_id = d.device_id
		WHERE a.device_id = $1 AND d.tenant_id = $2
	`, deviceID, tenantID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	defer rows.Close()

	var items []map[string]any
	for rows.Next() {
		var id, name, topic string
		var schemaRaw []byte
		if err := rows.Scan(&id, &name, &topic, &schemaRaw); err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}
		var schema map[string]any
		json.Unmarshal(schemaRaw, &schema)

		items = append(items, map[string]any{
			"actuator_id":    id,
			"name":           name,
			"command_topic":  topic,
			"payload_schema": schema,
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
			"name":     field.Name,
			"type":     strings.ToLower(field.Type),
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

func (a *app) syncDevicesToRedis(ctx context.Context) error {
	rows, err := a.db.QueryContext(ctx, "SELECT device_id::text, tenant_id::text, template_id::text FROM device_manager.devices")
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var dID, tID, tempID string
		if err := rows.Scan(&dID, &tID, &tempID); err != nil {
			return err
		}
		redisKey := fmt.Sprintf("device:%s", dID)
		redisData := map[string]interface{}{
			"tenant_id":   tID,
			"template_id": tempID,
		}
		encoded, _ := json.Marshal(redisData)
		a.redis.Set(ctx, redisKey, encoded, 0)
	}
	log.Println("Devices synced to Redis successfully")
	return nil
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
