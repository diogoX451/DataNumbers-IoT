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
	"regexp"
	"strings"
	"time"

	"github.com/Knetic/govaluate"
	"github.com/golang-jwt/jwt/v5"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/nats-io/nats.go"
)

// payloadVarPattern captura ${payload.foo.bar} e ${telemetry.device_id}, etc.
var payloadVarPattern = regexp.MustCompile(`\$\{([a-zA-Z_][a-zA-Z0-9_.]*)\}`)

type contextKey string

const (
	tenantIDKey contextKey = "tenant_id"
	userIDKey   contextKey = "user_id"
)

type app struct {
	db        *sql.DB
	nats      *nats.Conn
	js        nats.JetStreamContext
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

	js, err := nc.JetStream()
	if err != nil {
		log.Fatalf("jetstream: %v", err)
	}

	// Garante que o stream IOT_TELEMETRY existe antes de tentar QueueSubscribe.
	// Idempotente — se o data-management já criou, só atualiza.
	if err := ensureTelemetryStream(js); err != nil {
		log.Printf("ensure stream: %v", err)
	}

	pubKeyPath := env("JWT_PUBLIC_KEY_PATH", "public_key.pem")
	pubKey, err := os.ReadFile(pubKeyPath)
	if err != nil {
		log.Printf("warning: could not read JWT public key from %s: %v", pubKeyPath, err)
	}

	a := &app{db: db, nats: nc, js: js, jwtPubKey: pubKey}

	// Iniciar Worker de Regras
	go a.runRuleWorker()

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", a.health)

	mux.Handle("POST /rules", a.authMiddleware(http.HandlerFunc(a.createRule)))
	mux.Handle("GET /rules", a.authMiddleware(http.HandlerFunc(a.listRules)))
	mux.Handle("GET /rules/{id}", a.authMiddleware(http.HandlerFunc(a.getRule)))
	mux.Handle("PUT /rules/{id}", a.authMiddleware(http.HandlerFunc(a.updateRule)))
	mux.Handle("DELETE /rules/{id}", a.authMiddleware(http.HandlerFunc(a.deleteRule)))
	mux.Handle("POST /rules/{id}/actions", a.authMiddleware(http.HandlerFunc(a.createAction)))
	mux.Handle("GET /rules/{id}/actions", a.authMiddleware(http.HandlerFunc(a.listActions)))
	mux.Handle("DELETE /rules/{id}/actions/{actionId}", a.authMiddleware(http.HandlerFunc(a.deleteAction)))

	mux.Handle("POST /scenarios", a.authMiddleware(http.HandlerFunc(a.createScenario)))
	mux.Handle("GET /scenarios", a.authMiddleware(http.HandlerFunc(a.listScenarios)))
	mux.Handle("PUT /scenarios/{id}", a.authMiddleware(http.HandlerFunc(a.updateScenario)))
	mux.Handle("DELETE /scenarios/{id}", a.authMiddleware(http.HandlerFunc(a.deleteScenario)))
	mux.Handle("POST /scenarios/{id}/devices", a.authMiddleware(http.HandlerFunc(a.linkDeviceToScenario)))
	mux.Handle("GET /scenarios/{id}/devices", a.authMiddleware(http.HandlerFunc(a.listScenarioDevices)))
	mux.Handle("DELETE /scenarios/{id}/devices/{deviceId}", a.authMiddleware(http.HandlerFunc(a.unlinkDeviceFromScenario)))

	port := env("HTTP_PORT", "3004")
	log.Printf("rule-engine listening on :%s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}

// ensureTelemetryStream cria/atualiza o stream IOT_TELEMETRY. Idempotente.
// Mantemos uma cópia aqui (em vez de importar de data-management) para que
// o rule-engine não dependa do data-management iniciar primeiro.
func ensureTelemetryStream(js nats.JetStreamContext) error {
	cfg := &nats.StreamConfig{
		Name:      "IOT_TELEMETRY",
		Subjects:  []string{"iot.telemetry.received", "iot.telemetry.dlq"},
		Retention: nats.LimitsPolicy,
		MaxAge:    7 * 24 * time.Hour,
		Storage:   nats.FileStorage,
	}
	if _, err := js.StreamInfo("IOT_TELEMETRY"); err != nil {
		_, err = js.AddStream(cfg)
		return err
	}
	_, err := js.UpdateStream(cfg)
	return err
}

func (a *app) runRuleWorker() {
	subject := env("NATS_TELEMETRY_SUBJECT", "iot.telemetry.received")

	// QueueSubscribe sobre JetStream para garantir replay e load balancing.
	// data-management já cria o stream IOT_TELEMETRY; aqui só nos juntamos a
	// ele como consumer durable separado, paralelo ao persistor.
	_, err := a.js.QueueSubscribe(subject, "rule-engine-group", func(msg *nats.Msg) {
		var telemetry map[string]any
		if err := json.Unmarshal(msg.Data, &telemetry); err != nil {
			_ = msg.Ack()
			return
		}

		tenantID, _ := telemetry["tenant_id"].(string)
		if tenantID == "" {
			_ = msg.Ack()
			return
		}

		a.evaluateRules(tenantID, telemetry)
		_ = msg.Ack()
	},
		nats.Durable("rule-engine-group"),
		nats.ManualAck(),
		nats.AckWait(30*time.Second),
		nats.MaxDeliver(5),
	)
	if err != nil {
		log.Printf("rule worker subscribe: %v — falling back to core NATS", err)
		_, errCore := a.nats.QueueSubscribe(subject, "rule-engine-group", func(msg *nats.Msg) {
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
		if errCore != nil {
			log.Printf("core nats fallback subscribe: %v", errCore)
		}
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
	// Tenant scoping: só dispara ações cujo atuador pertence a um device do
	// mesmo tenant da regra. Sem isso, qualquer rule_action criada apontando
	// para actuator de outro tenant geraria comando indevido.
	rows, err := a.db.Query(`
		SELECT ra.action_id, ra.actuator_id, ra.payload_template, act.command_topic, act.device_id
		FROM automation.rule_actions ra
		JOIN device_manager.actuators act ON ra.actuator_id = act.actuator_id
		JOIN device_manager.devices d ON act.device_id = d.device_id
		JOIN automation.rules r ON ra.rule_id = r.rule_id
		WHERE ra.rule_id = $1 AND d.tenant_id = r.tenant_id
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

		rendered := renderPayloadTemplate(payloadTemplate, telemetry)

		command := map[string]any{
			"event_id":      newEventID(),
			"action_id":     actionID,
			"actuator_id":   actuatorID,
			"device_id":     deviceID,
			"command_topic": topic,
			"payload":       json.RawMessage(rendered),
			"timestamp":     time.Now().UTC().Format(time.RFC3339),
		}

		body, err := json.Marshal(command)
		if err != nil {
			log.Printf("marshal command for rule %s: %v", ruleID, err)
			continue
		}
		if err := a.nats.Publish("iot.command.send", body); err != nil {
			log.Printf("publish command for rule %s: %v", ruleID, err)
			continue
		}
		log.Printf("Action triggered for rule %s: Command sent to %s", ruleID, topic)
	}
}

// renderPayloadTemplate substitui placeholders ${payload.x}, ${telemetry.y} no
// template JSON usando valores da mensagem de telemetria. Se um placeholder
// não bater com nada da telemetria, mantém o literal — assim o operador vê o
// problema em vez de receber payload silenciosamente "vazio".
func renderPayloadTemplate(template string, telemetry map[string]any) string {
	if template == "" {
		return "{}"
	}
	return payloadVarPattern.ReplaceAllStringFunc(template, func(match string) string {
		path := payloadVarPattern.FindStringSubmatch(match)[1]
		value, ok := lookupPath(telemetry, path)
		if !ok {
			return match
		}
		encoded, err := json.Marshal(value)
		if err != nil {
			return match
		}
		return string(encoded)
	})
}

// lookupPath navega por chaves separadas por ponto em maps aninhados.
// Aceita "payload.X" como atalho para olhar dentro do sub-objeto "payload".
func lookupPath(root map[string]any, path string) (any, bool) {
	parts := strings.Split(path, ".")
	var current any = root
	for _, p := range parts {
		m, ok := current.(map[string]any)
		if !ok {
			return nil, false
		}
		current, ok = m[p]
		if !ok {
			return nil, false
		}
	}
	return current, true
}

// Handlers CRUD
func (a *app) createRule(w http.ResponseWriter, r *http.Request) {
	var input Rule
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	if input.Name == "" || input.TriggerCondition == "" {
		writeError(w, http.StatusBadRequest, errors.New("name and trigger_condition are required"))
		return
	}
	if _, err := govaluate.NewEvaluableExpression(input.TriggerCondition); err != nil {
		writeError(w, http.StatusBadRequest, fmt.Errorf("invalid trigger_condition: %w", err))
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
	input.TenantID = tenantID
	input.IsActive = true

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

	tenantID, _ := r.Context().Value(tenantIDKey).(string)
	if tenantID == "" {
		writeError(w, http.StatusUnauthorized, errors.New("missing tenant"))
		return
	}

	// Garante que a regra e o atuador pertencem ao mesmo tenant do caller,
	// fechando vetor de cross-tenant action injection.
	var ok bool
	err := a.db.QueryRow(`
		SELECT EXISTS(
			SELECT 1
			FROM automation.rules r
			JOIN device_manager.actuators a ON a.actuator_id = $2
			JOIN device_manager.devices d ON a.device_id = d.device_id
			WHERE r.rule_id = $1
			  AND r.tenant_id = $3
			  AND d.tenant_id = $3
		)
	`, ruleID, input.ActuatorID, tenantID).Scan(&ok)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	if !ok {
		writeError(w, http.StatusNotFound, errors.New("rule or actuator not found for tenant"))
		return
	}

	err = a.db.QueryRow(`
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

func (a *app) getRule(w http.ResponseWriter, r *http.Request) {
	ruleID := r.PathValue("id")
	tenantID := r.Context().Value(tenantIDKey).(string)

	var rule Rule
	var sID sql.NullString
	err := a.db.QueryRow(`
		SELECT rule_id, scenario_id::text, name, COALESCE(description, ''), is_active, trigger_condition
		FROM automation.rules
		WHERE rule_id = $1 AND tenant_id = $2
	`, ruleID, tenantID).Scan(&rule.ID, &sID, &rule.Name, &rule.Description, &rule.IsActive, &rule.TriggerCondition)
	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, errors.New("rule not found"))
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	rule.ScenarioID = sID.String
	rule.TenantID = tenantID
	writeJSON(w, http.StatusOK, rule)
}

func (a *app) updateRule(w http.ResponseWriter, r *http.Request) {
	ruleID := r.PathValue("id")
	tenantID := r.Context().Value(tenantIDKey).(string)

	var input struct {
		Name             string `json:"name"`
		Description      string `json:"description"`
		TriggerCondition string `json:"trigger_condition"`
		ScenarioID       string `json:"scenario_id"`
		IsActive         *bool  `json:"is_active"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	if input.TriggerCondition != "" {
		if _, err := govaluate.NewEvaluableExpression(input.TriggerCondition); err != nil {
			writeError(w, http.StatusBadRequest, fmt.Errorf("invalid trigger_condition: %w", err))
			return
		}
	}

	var isActive sql.NullBool
	if input.IsActive != nil {
		isActive.Bool = *input.IsActive
		isActive.Valid = true
	}
	var scenarioID sql.NullString
	if input.ScenarioID != "" {
		scenarioID.String = input.ScenarioID
		scenarioID.Valid = true
	}

	res, err := a.db.Exec(`
		UPDATE automation.rules
		SET name              = COALESCE(NULLIF($1, ''), name),
		    description       = COALESCE(NULLIF($2, ''), description),
		    trigger_condition = COALESCE(NULLIF($3, ''), trigger_condition),
		    scenario_id       = COALESCE($4, scenario_id),
		    is_active         = COALESCE($5, is_active),
		    updated_at        = now()
		WHERE rule_id = $6 AND tenant_id = $7
	`, input.Name, input.Description, input.TriggerCondition, scenarioID, isActive, ruleID, tenantID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	if affected, _ := res.RowsAffected(); affected == 0 {
		writeError(w, http.StatusNotFound, errors.New("rule not found"))
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func (a *app) deleteRule(w http.ResponseWriter, r *http.Request) {
	ruleID := r.PathValue("id")
	tenantID := r.Context().Value(tenantIDKey).(string)

	res, err := a.db.Exec(`DELETE FROM automation.rules WHERE rule_id = $1 AND tenant_id = $2`, ruleID, tenantID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	if affected, _ := res.RowsAffected(); affected == 0 {
		writeError(w, http.StatusNotFound, errors.New("rule not found"))
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *app) listActions(w http.ResponseWriter, r *http.Request) {
	ruleID := r.PathValue("id")
	tenantID := r.Context().Value(tenantIDKey).(string)

	rows, err := a.db.Query(`
		SELECT ra.action_id, ra.actuator_id, ra.payload_template::text, act.command_topic
		FROM automation.rule_actions ra
		JOIN automation.rules r ON ra.rule_id = r.rule_id
		JOIN device_manager.actuators act ON ra.actuator_id = act.actuator_id
		WHERE ra.rule_id = $1 AND r.tenant_id = $2
	`, ruleID, tenantID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	defer rows.Close()

	actions := []RuleAction{}
	for rows.Next() {
		var a RuleAction
		if err := rows.Scan(&a.ID, &a.ActuatorID, &a.PayloadTemplate, &a.CommandTopic); err != nil {
			continue
		}
		a.RuleID = ruleID
		actions = append(actions, a)
	}
	writeJSON(w, http.StatusOK, actions)
}

func (a *app) deleteAction(w http.ResponseWriter, r *http.Request) {
	ruleID := r.PathValue("id")
	actionID := r.PathValue("actionId")
	tenantID := r.Context().Value(tenantIDKey).(string)

	res, err := a.db.Exec(`
		DELETE FROM automation.rule_actions ra
		USING automation.rules r
		WHERE ra.action_id = $1 AND ra.rule_id = $2 AND ra.rule_id = r.rule_id AND r.tenant_id = $3
	`, actionID, ruleID, tenantID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	if affected, _ := res.RowsAffected(); affected == 0 {
		writeError(w, http.StatusNotFound, errors.New("action not found"))
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *app) updateScenario(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	tenantID := r.Context().Value(tenantIDKey).(string)

	var input Scenario
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	res, err := a.db.Exec(`
		UPDATE automation.scenarios
		SET name = COALESCE(NULLIF($1, ''), name),
		    description = COALESCE(NULLIF($2, ''), description),
		    updated_at = now()
		WHERE scenario_id = $3 AND tenant_id = $4
	`, input.Name, input.Description, id, tenantID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	if affected, _ := res.RowsAffected(); affected == 0 {
		writeError(w, http.StatusNotFound, errors.New("scenario not found"))
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func (a *app) deleteScenario(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	tenantID := r.Context().Value(tenantIDKey).(string)

	res, err := a.db.Exec(`DELETE FROM automation.scenarios WHERE scenario_id = $1 AND tenant_id = $2`, id, tenantID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	if affected, _ := res.RowsAffected(); affected == 0 {
		writeError(w, http.StatusNotFound, errors.New("scenario not found"))
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *app) unlinkDeviceFromScenario(w http.ResponseWriter, r *http.Request) {
	scenarioID := r.PathValue("id")
	deviceID := r.PathValue("deviceId")
	tenantID := r.Context().Value(tenantIDKey).(string)

	res, err := a.db.Exec(`
		DELETE FROM automation.scenario_devices sd
		USING automation.scenarios s
		WHERE sd.scenario_id = $1 AND sd.device_id = $2
		  AND sd.scenario_id = s.scenario_id AND s.tenant_id = $3
	`, scenarioID, deviceID, tenantID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	if affected, _ := res.RowsAffected(); affected == 0 {
		writeError(w, http.StatusNotFound, errors.New("link not found"))
		return
	}
	w.WriteHeader(http.StatusNoContent)
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
