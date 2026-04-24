package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/nats-io/nats.go"
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

	subject := env("NATS_TELEMETRY_SUBJECT", "iot.telemetry.received")
	if _, err := nc.Subscribe(subject, func(msg *nats.Msg) {
		if err := persistTelemetry(context.Background(), db, msg.Data); err != nil {
			log.Printf("persist telemetry: %v", err)
			return
		}
	}); err != nil {
		log.Fatalf("subscribe %s: %v", subject, err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})

	port := env("HTTP_PORT", "3003")
	log.Printf("data-management subscribed to %s and listening on :%s", subject, port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
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
