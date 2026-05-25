package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/nats-io/nats.go"
)

type contextKey string

const (
	tenantIDKey contextKey = "tenant_id"
	userIDKey   contextKey = "user_id"
)

type telemetryMessage struct {
	EventID       string         `json:"event_id"`
	DeviceID      string         `json:"device_id"`
	TemplateID    string         `json:"template_id"`
	TenantID      string         `json:"tenant_id"`
	SchemaVersion int            `json:"schema_version"`
	Topic         string         `json:"topic"`
	Timestamp     string         `json:"timestamp"`
	Payload       map[string]any `json:"payload"`
	Metadata      map[string]any `json:"metadata"`
}

type app struct {
	db        *sql.DB
	js        nats.JetStreamContext
	jwtPubKey []byte
}

const (
	streamName     = "IOT_TELEMETRY"
	telemetrySubj  = "iot.telemetry.received"
	telemetryDLQ   = "iot.telemetry.dlq"
	consumerName   = "data-management-worker"
	maxDeliver     = 5
	ackWait        = 30 * time.Second
)

func main() {
	db, err := sql.Open("pgx", requiredEnv("DATABASE_URL"))
	if err != nil {
		log.Fatalf("open database: %v", err)
	}
	defer db.Close()

	if err := db.PingContext(context.Background()); err != nil {
		log.Fatalf("ping database: %v", err)
	}

	nc, err := nats.Connect(env("NATS_URL", nats.DefaultURL))
	if err != nil {
		log.Fatalf("connect nats: %v", err)
	}
	defer nc.Close()

	js, err := nc.JetStream()
	if err != nil {
		log.Fatalf("jetstream: %v", err)
	}

	if err := ensureStream(js); err != nil {
		log.Fatalf("ensure stream: %v", err)
	}

	pubKeyPath := env("JWT_PUBLIC_KEY_PATH", "public_key.pem")
	pubKey, err := os.ReadFile(pubKeyPath)
	if err != nil {
		log.Printf("warning: could not read JWT public key from %s: %v", pubKeyPath, err)
	}

	a := &app{db: db, js: js, jwtPubKey: pubKey}

	subject := env("NATS_TELEMETRY_SUBJECT", telemetrySubj)
	if err := a.subscribe(subject, nc); err != nil {
		log.Fatalf("subscribe: %v", err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})
	mux.Handle("GET /devices/{id}/data", a.authMiddleware(http.HandlerFunc(a.listDeviceData)))
	mux.Handle("GET /devices/{id}/aggregations", a.authMiddleware(http.HandlerFunc(a.aggregateDeviceData)))

	port := env("HTTP_PORT", "3003")
	log.Printf("data-management subscribed to %s and listening on :%s", subject, port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}

// ensureStream cria (ou atualiza) o stream IOT_TELEMETRY com retenção de 7 dias
// e DLQ subject. Idempotente.
func ensureStream(js nats.JetStreamContext) error {
	cfg := &nats.StreamConfig{
		Name:      streamName,
		Subjects:  []string{telemetrySubj, telemetryDLQ},
		Retention: nats.LimitsPolicy,
		MaxAge:    7 * 24 * time.Hour,
		Storage:   nats.FileStorage,
	}
	if _, err := js.StreamInfo(streamName); err != nil {
		if !errors.Is(err, nats.ErrStreamNotFound) {
			return err
		}
		_, err = js.AddStream(cfg)
		return err
	}
	_, err := js.UpdateStream(cfg)
	return err
}

func (a *app) subscribe(subject string, nc *nats.Conn) error {
	// Consumer durable com AckExplicit + redelivery limitada. Após maxDeliver
	// tentativas, a mensagem é publicada na DLQ e ack-ada para sair da fila
	// principal.
	_, err := a.js.QueueSubscribe(subject, consumerName, func(msg *nats.Msg) {
		err := persistTelemetry(context.Background(), a.db, msg.Data)
		if err == nil {
			_ = msg.Ack()
			return
		}
		log.Printf("persist telemetry: %v", err)

		md, _ := msg.Metadata()
		if md != nil && md.NumDelivered >= maxDeliver {
			log.Printf("telemetry message exceeded maxDeliver=%d, sending to DLQ", maxDeliver)
			if pubErr := nc.Publish(telemetryDLQ, msg.Data); pubErr != nil {
				log.Printf("publish DLQ: %v", pubErr)
				_ = msg.Nak()
				return
			}
			_ = msg.Ack()
			return
		}
		_ = msg.NakWithDelay(2 * time.Second)
	},
		nats.Durable(consumerName),
		nats.ManualAck(),
		nats.AckWait(ackWait),
		nats.MaxDeliver(maxDeliver),
	)
	return err
}

// authMiddleware: igual ao usado nos demais serviços (RS256, claims.data.{user_id,tenant_id}).
func (a *app) authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if !strings.HasPrefix(authHeader, "Bearer ") {
			writeError(w, http.StatusUnauthorized, errors.New("unauthorized"))
			return
		}
		tokenString := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
		key, err := jwt.ParseRSAPublicKeyFromPEM(a.jwtPubKey)
		if err != nil {
			writeError(w, http.StatusInternalServerError, errors.New("jwt key not configured"))
			return
		}
		token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodRSA); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
			}
			return key, nil
		})
		if err != nil || !token.Valid {
			writeError(w, http.StatusUnauthorized, errors.New("invalid token"))
			return
		}
		claims, _ := token.Claims.(jwt.MapClaims)
		data, _ := claims["data"].(map[string]any)
		userID, _ := data["user_id"].(string)
		tenantID, _ := data["tenant_id"].(string)
		if tenantID == "" {
			writeError(w, http.StatusUnauthorized, errors.New("missing tenant"))
			return
		}
		ctx := context.WithValue(r.Context(), userIDKey, userID)
		ctx = context.WithValue(ctx, tenantIDKey, tenantID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (a *app) listDeviceData(w http.ResponseWriter, r *http.Request) {
	deviceID := r.PathValue("id")
	tenantID := r.Context().Value(tenantIDKey).(string)

	from, to := parseTimeRange(r)
	limit := parseLimit(r, 100, 1000)

	rows, err := a.db.QueryContext(r.Context(), `
		SELECT time, event_id::text, payload::text, metadata::text, topic
		FROM data_management.devices_data
		WHERE tenant_id = $1 AND device_id = $2 AND time >= $3 AND time <= $4
		ORDER BY time DESC
		LIMIT $5
	`, tenantID, deviceID, from, to, limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	defer rows.Close()

	items := []map[string]any{}
	for rows.Next() {
		var t time.Time
		var eventID, payloadStr, metadataStr, topic string
		if err := rows.Scan(&t, &eventID, &payloadStr, &metadataStr, &topic); err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}
		var payload, metadata any
		_ = json.Unmarshal([]byte(payloadStr), &payload)
		_ = json.Unmarshal([]byte(metadataStr), &metadata)
		items = append(items, map[string]any{
			"time":     t.UTC().Format(time.RFC3339),
			"event_id": eventID,
			"topic":    topic,
			"payload":  payload,
			"metadata": metadata,
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": items})
}

func (a *app) aggregateDeviceData(w http.ResponseWriter, r *http.Request) {
	deviceID := r.PathValue("id")
	tenantID := r.Context().Value(tenantIDKey).(string)
	from, to := parseTimeRange(r)
	bucket := r.URL.Query().Get("bucket")
	if bucket == "" {
		bucket = "5 minutes"
	}
	field := r.URL.Query().Get("field")
	if field == "" {
		writeError(w, http.StatusBadRequest, errors.New("field query param is required"))
		return
	}

	// Usa time_bucket() do TimescaleDB. O cast (payload->>field)::numeric
	// gera erro se algum row tiver tipo não numérico — por isso filtramos com
	// jsonb_typeof.
	rows, err := a.db.QueryContext(r.Context(), `
		SELECT time_bucket($1::interval, time) AS bucket,
		       AVG((payload->>$2)::numeric) AS avg,
		       MIN((payload->>$2)::numeric) AS min,
		       MAX((payload->>$2)::numeric) AS max,
		       COUNT(*) AS samples
		FROM data_management.devices_data
		WHERE tenant_id = $3 AND device_id = $4
		  AND time >= $5 AND time <= $6
		  AND jsonb_typeof(payload->$2) = 'number'
		GROUP BY bucket
		ORDER BY bucket ASC
	`, bucket, field, tenantID, deviceID, from, to)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	defer rows.Close()

	out := []map[string]any{}
	for rows.Next() {
		var ts time.Time
		var avg, min, max sql.NullFloat64
		var samples int
		if err := rows.Scan(&ts, &avg, &min, &max, &samples); err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}
		out = append(out, map[string]any{
			"bucket":  ts.UTC().Format(time.RFC3339),
			"avg":     nullFloat(avg),
			"min":     nullFloat(min),
			"max":     nullFloat(max),
			"samples": samples,
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": out, "field": field, "bucket": bucket})
}

func parseTimeRange(r *http.Request) (time.Time, time.Time) {
	now := time.Now().UTC()
	from := now.Add(-24 * time.Hour)
	to := now
	if v := r.URL.Query().Get("from"); v != "" {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			from = t
		}
	}
	if v := r.URL.Query().Get("to"); v != "" {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			to = t
		}
	}
	return from, to
}

func parseLimit(r *http.Request, def, max int) int {
	v := r.URL.Query().Get("limit")
	if v == "" {
		return def
	}
	n, err := strconv.Atoi(v)
	if err != nil || n <= 0 {
		return def
	}
	if n > max {
		return max
	}
	return n
}

func nullFloat(v sql.NullFloat64) any {
	if !v.Valid {
		return nil
	}
	return v.Float64
}

func persistTelemetry(ctx context.Context, db *sql.DB, raw []byte) error {
	var input telemetryMessage
	if err := json.Unmarshal(raw, &input); err != nil {
		return err
	}
	if input.SchemaVersion == 0 {
		input.SchemaVersion = 1
	}
	if isZeroUUID(input.TemplateID) {
		templateID, err := resolveTemplateID(ctx, db, input.DeviceID, input.Topic)
		if err != nil {
			return err
		}
		input.TemplateID = templateID
	}

	occurredAt := time.Now().UTC()
	if input.Timestamp != "" {
		parsed, err := time.Parse(time.RFC3339, input.Timestamp)
		if err != nil {
			return err
		}
		occurredAt = parsed
	}

	payload, err := json.Marshal(input.Payload)
	if err != nil {
		return err
	}

	metadata := input.Metadata
	if metadata == nil {
		metadata = map[string]any{}
	}
	metadataBody, err := json.Marshal(metadata)
	if err != nil {
		return err
	}

	_, err = db.ExecContext(ctx, `
		INSERT INTO data_management.devices_data (
			time,
			tenant_id,
			event_id,
			device_id,
			template_id,
			schema_version,
			topic,
			payload,
			metadata
		)
		VALUES ($1, NULLIF($2, '')::uuid, NULLIF($3, '')::uuid, NULLIF($4, '')::uuid, NULLIF($5, '')::uuid, $6, $7, $8::jsonb, $9::jsonb)
	`, occurredAt, input.TenantID, input.EventID, input.DeviceID, input.TemplateID, input.SchemaVersion, input.Topic, string(payload), string(metadataBody))
	return err
}

func resolveTemplateID(ctx context.Context, db *sql.DB, deviceID string, topic string) (string, error) {
	var templateID string
	err := db.QueryRowContext(ctx, `
		SELECT template_id::text
		FROM device_manager.devices
		WHERE device_id = NULLIF($1, '')::uuid OR mqtt_topic = $2
		LIMIT 1
	`, deviceID, topic).Scan(&templateID)
	if err == nil {
		return templateID, nil
	}
	if err == sql.ErrNoRows {
		return "00000000-0000-0000-0000-000000000000", nil
	}
	return "", err
}

func isZeroUUID(value string) bool {
	return value == "" || strings.EqualFold(value, "00000000-0000-0000-0000-000000000000")
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
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
