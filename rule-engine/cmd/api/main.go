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

	"github.com/Knetic/govaluate"
	"github.com/golang-jwt/jwt/v5"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/nats-io/nats.go"
)

type contextKey string

const (
	tenantIDKey contextKey = "tenant_id"
	userIDKey   contextKey = "user_id"
)

type app struct {
	db        *sql.DB
	nats      *nats.Conn
	jwtPubKey []byte
}

type Rule struct {
	ID               string `json:"rule_id"`
	TenantID         string `json:"tenant_id"`
	ScenarioID       string `json:"scenario_id,omitempty"`
	Name             string `json:"name"`
	Description      string `json:"description"`
	IsActive         bool   `json:"is_active"`
	TriggerCondition string `json:"trigger_condition"`
}

type Scenario struct {
	ID          string `json:"scenario_id"`
	TenantID    string `json:"tenant_id"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

type ScenarioDevice struct {
	ScenarioID string `json:"scenario_id"`
	DeviceID   string `json:"device_id"`
}

type RuleAction struct {
	ID               string `json:"action_id"`
	RuleID           string `json:"rule_id"`
	ActuatorID       string `json:"actuator_id"`
	PayloadTemplate  string `json:"payload_template"`
	CommandTopic     string `json:"command_topic"` // Cacheado para facilitar
}

func main() {
	db, err := sql.Open("pgx", requiredEnv("DATABASE_URL"))
	if err != nil {
		log.Fatalf("open database: %v", err)
	}
	defer db.Close()

	nc, err := nats.Connect(env("NATS_URL", nats.DefaultURL))
	if err != nil {
		log.Fatalf("connect nats: %v", err)
	}
	defer nc.Close()

	pubKeyPath := env("JWT_PUBLIC_KEY_PATH", "public_key.pem")
	pubKey, _ := os.ReadFile(pubKeyPath)

	a := &app{db: db, nats: nc, jwtPubKey: pubKey}

	// Iniciar Worker de Regras
	go a.runRuleWorker()

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", a.health)
	mux.Handle("POST /rules", a.authMiddleware(http.HandlerFunc(a.createRule)))
	mux.Handle("GET /rules", a.authMiddleware(http.HandlerFunc(a.listRules)))
	mux.Handle("POST /rules/{id}/actions", a.authMiddleware(http.HandlerFunc(a.createAction)))

	mux.Handle("POST /scenarios", a.authMiddleware(http.HandlerFunc(a.createScenario)))
	mux.Handle("GET /scenarios", a.authMiddleware(http.HandlerFunc(a.listScenarios)))
	mux.Handle("POST /scenarios/{id}/devices", a.authMiddleware(http.HandlerFunc(a.linkDeviceToScenario)))
	mux.Handle("GET /scenarios/{id}/devices", a.authMiddleware(http.HandlerFunc(a.listScenarioDevices)))

	port := env("HTTP_PORT", "3004")
	log.Printf("rule-engine listening on :%s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}

func (a *app) runRuleWorker() {
	subject := env("NATS_TELEMETRY_SUBJECT", "iot.telemetry.received")
	_, err := a.nats.QueueSubscribe(subject, "rule-engine-group", func(msg *nats.Msg) {
		var telemetry map[string]any
		if err := json.Unmarshal(msg.Data, &telemetry); err != nil {
			return
		}

		tenantID, _ := telemetry["tenant_id"].(string)
		if tenantID == "" {
			return
		}

		a.evaluateRules(tenantID, telemetry)
	})
	if err != nil {
		log.Printf("error subscribing to nats: %v", err)
	}
}

func (a *app) evaluateRules(tenantID string, telemetry map[string]any) {
	rows, err := a.db.Query(`
		SELECT rule_id, trigger_condition 
		FROM automation.rules 
		WHERE tenant_id = $1 AND is_active = true
	`, tenantID)
	if err != nil {
		return
	}
	defer rows.Close()

	payload, _ := telemetry["payload"].(map[string]any)
	if payload == nil {
		payload = make(map[string]any)
	}

	for rows.Next() {
		var ruleID, condition string
		if err := rows.Scan(&ruleID, &condition); err != nil {
			continue
		}

		expression, err := govaluate.NewEvaluableExpression(condition)
		if err != nil {
			log.Printf("invalid expression for rule %s: %v", ruleID, err)
			continue
		}

		result, err := expression.Evaluate(payload)
		if err != nil {
			continue
		}

		if active, ok := result.(bool); ok && active {
			a.triggerActions(ruleID, telemetry)
		}
	}
}

func (a *app) triggerActions(ruleID string, telemetry map[string]any) {
	rows, err := a.db.Query(`
		SELECT ra.action_id, ra.actuator_id, ra.payload_template, act.command_topic, act.device_id
		FROM automation.rule_actions ra
		JOIN device_manager.actuators act ON ra.actuator_id = act.actuator_id
		WHERE ra.rule_id = $1
	`, ruleID)
	if err != nil {
		return
	}
	defer rows.Close()

	for rows.Next() {
		var actionID, actuatorID, payloadTemplate, topic, deviceID string
		if err := rows.Scan(&actionID, &actuatorID, &payloadTemplate, &topic, &deviceID); err != nil {
			continue
		}

		command := map[string]any{
			"event_id":      newEventID(),
			"actuator_id":   actuatorID,
			"device_id":     deviceID,
			"command_topic": topic,
			"payload":       json.RawMessage(payloadTemplate),
			"timestamp":     time.Now().UTC().Format(time.RFC3339),
		}

		body, _ := json.Marshal(command)
		a.nats.Publish("iot.command.send", body)
		log.Printf("Action triggered for rule %s: Command sent to %s", ruleID, topic)
	}
}

// Handlers CRUD
func (a *app) createRule(w http.ResponseWriter, r *http.Request) {
	var input Rule
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	tenantID := r.Context().Value(tenantIDKey).(string)
	
	var scenarioID sql.NullString
	if input.ScenarioID != "" {
		scenarioID.String = input.ScenarioID
		scenarioID.Valid = true
	}

	err := a.db.QueryRow(`
		INSERT INTO automation.rules (tenant_id, scenario_id, name, description, trigger_condition)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING rule_id
	`, tenantID, scenarioID, input.Name, input.Description, input.TriggerCondition).Scan(&input.ID)

	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	writeJSON(w, http.StatusCreated, input)
}

func (a *app) listRules(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Context().Value(tenantIDKey).(string)
	scenarioID := r.URL.Query().Get("scenario_id")

	query := `SELECT rule_id, scenario_id::text, name, description, is_active, trigger_condition FROM automation.rules WHERE tenant_id = $1`
	args := []any{tenantID}
	
	if scenarioID != "" {
		query += ` AND scenario_id = $2`
		args = append(args, scenarioID)
	}

	rows, err := a.db.Query(query, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	defer rows.Close()

	rules := []Rule{}
	for rows.Next() {
		var r Rule
		var sID sql.NullString
		rows.Scan(&r.ID, &sID, &r.Name, &r.Description, &r.IsActive, &r.TriggerCondition)
		r.ScenarioID = sID.String
		rules = append(rules, r)
	}
	writeJSON(w, http.StatusOK, rules)
}

func (a *app) createScenario(w http.ResponseWriter, r *http.Request) {
	var input Scenario
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	tenantID := r.Context().Value(tenantIDKey).(string)
	err := a.db.QueryRow(`
		INSERT INTO automation.scenarios (tenant_id, name, description)
		VALUES ($1, $2, $3)
		RETURNING scenario_id
	`, tenantID, input.Name, input.Description).Scan(&input.ID)

	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	writeJSON(w, http.StatusCreated, input)
}

func (a *app) listScenarios(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Context().Value(tenantIDKey).(string)
	rows, err := a.db.Query(`SELECT scenario_id, name, description FROM automation.scenarios WHERE tenant_id = $1`, tenantID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	defer rows.Close()

	scenarios := []Scenario{}
	for rows.Next() {
		var s Scenario
		rows.Scan(&s.ID, &s.Name, &s.Description)
		scenarios = append(scenarios, s)
	}
	writeJSON(w, http.StatusOK, scenarios)
}

func (a *app) linkDeviceToScenario(w http.ResponseWriter, r *http.Request) {
	scenarioID := r.PathValue("id")
	var input struct {
		DeviceID string `json:"device_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	_, err := a.db.Exec(`
		INSERT INTO automation.scenario_devices (scenario_id, device_id)
		VALUES ($1, $2)
		ON CONFLICT DO NOTHING
	`, scenarioID, input.DeviceID)

	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "linked"})
}

func (a *app) listScenarioDevices(w http.ResponseWriter, r *http.Request) {
	scenarioID := r.PathValue("id")
	rows, err := a.db.Query(`
		SELECT d.device_id, d.device_name, d.mqtt_topic 
		FROM device_manager.devices d
		JOIN automation.scenario_devices sd ON d.device_id = sd.device_id
		WHERE sd.scenario_id = $1
	`, scenarioID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	defer rows.Close()

	devices := []map[string]any{}
	for rows.Next() {
		var id, name, topic string
		rows.Scan(&id, &name, &topic)
		devices = append(devices, map[string]any{
			"device_id": id,
			"name":      name,
			"topic":     topic,
		})
	}
	writeJSON(w, http.StatusOK, devices)
}

func (a *app) createAction(w http.ResponseWriter, r *http.Request) {
	ruleID := r.PathValue("id")
	var input RuleAction
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	err := a.db.QueryRow(`
		INSERT INTO automation.rule_actions (rule_id, actuator_id, payload_template)
		VALUES ($1, $2, $3)
		RETURNING action_id
	`, ruleID, input.ActuatorID, input.PayloadTemplate).Scan(&input.ID)

	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	writeJSON(w, http.StatusCreated, input)
}

// Helpers (Copiados de device-manager para manter consistência)
func (a *app) authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			writeError(w, http.StatusUnauthorized, errors.New("unauthorized"))
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		key, _ := jwt.ParseRSAPublicKeyFromPEM(a.jwtPubKey)
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return key, nil
		})

		if err != nil || !token.Valid {
			writeError(w, http.StatusUnauthorized, errors.New("invalid token"))
			return
		}

		claims := token.Claims.(jwt.MapClaims)
		data := claims["data"].(map[string]any)
		ctx := context.WithValue(r.Context(), userIDKey, data["user_id"])
		ctx = context.WithValue(ctx, tenantIDKey, data["tenant_id"])
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (a *app) health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, err error) {
	writeJSON(w, status, map[string]string{"error": err.Error()})
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func requiredEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("%s is required", key)
	}
	return v
}

func newEventID() string {
	var b [16]byte
	rand.Read(b[:])
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}
