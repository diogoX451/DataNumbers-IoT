package main

import (
	"encoding/json"
	"log"
	"time"

	"github.com/nats-io/nats.go"
)

func main() {
	nc, err := nats.Connect("nats://localhost:4222")
	if err != nil {
		log.Fatal(err)
	}
	defer nc.Close()

	payload := map[string]interface{}{
		"event_id":   "test-event",
		"device_id":  "71d19c1a-7261-4c71-ac1e-46d0fea67d64",
		"tenant_id":  "e28562d4-c6a1-468e-8498-91884c2bf354",
		"timestamp":  time.Now().Format(time.RFC3339),
		"payload":    map[string]interface{}{"temp": 35.0},
	}

	data, _ := json.Marshal(payload)
	err = nc.Publish("iot.telemetry.received", data)
	if err != nil {
		log.Fatal(err)
	}

	log.Println("Simulated telemetry published to NATS")
}
