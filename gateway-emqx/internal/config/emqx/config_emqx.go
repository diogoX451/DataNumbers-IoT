package emqx_config

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/diogoX451/gateway-broker/internal/config"
	"github.com/diogoX451/gateway-broker/internal/interfaces"
	mqtt "github.com/eclipse/paho.mqtt.golang"
)

type EmqxConfig struct {
	config *mqtt.ClientOptions
	queue  interfaces.IProducer
}

func (e *EmqxConfig) GetConfig() *mqtt.ClientOptions {
	return e.config
}

func (e *EmqxConfig) SetQueue(queue interfaces.IProducer) {
	if e.queue != nil {
		return
	}

	e.queue = queue
}

func (e *EmqxConfig) SetConfig(options *mqtt.ClientOptions) {
	options.AutoReconnect = true
	options.Username = "gateway"
	options.SetClientID("gateway")
	options.AddBroker(fmt.Sprintf("tcp://%s:%s", config.Get("HOST_EMQX"), config.Get("PORT_EMQX")))
	options.OnConnect = func(client mqtt.Client) {
		topics := config.GetYaml().Queue.Topics
		client.Subscribe(topics.GatewayData+"/#", 0, func(client mqtt.Client, msg mqtt.Message) {
			e.queue.Publish(topics.TelemetryReceived, 0, false, buildTelemetryEnvelope(msg.Topic(), msg.Payload()))
		})
	}

	e.config = options
}

func buildTelemetryEnvelope(topic string, raw []byte) string {
	var body map[string]interface{}
	if err := json.Unmarshal(raw, &body); err != nil {
		body = map[string]interface{}{
			"payload": map[string]interface{}{
				"value": string(raw),
			},
		}
	}

	payload, ok := body["payload"].(map[string]interface{})
	if !ok {
		payload = map[string]interface{}{"value": body["payload"]}
	}

	deviceID := stringValue(body["device_id"])
	if deviceID == "" {
		deviceID = topicSuffix(topic)
	}
	if !isUUID(deviceID) {
		deviceID = "00000000-0000-0000-0000-000000000000"
	}

	templateID := stringValue(body["template_id"])
	if !isUUID(templateID) {
		templateID = "00000000-0000-0000-0000-000000000000"
	}

	envelope := map[string]interface{}{
		"event_id":       newUUID(),
		"device_id":      deviceID,
		"template_id":    templateID,
		"schema_version": 1,
		"topic":          topic,
		"timestamp":      time.Now().UTC().Format(time.RFC3339),
		"payload":        payload,
		"metadata": map[string]interface{}{
			"source": "emqx",
		},
	}

	encoded, err := json.Marshal(envelope)
	if err != nil {
		log.Printf("error encoding telemetry envelope: %v", err)
		return "{}"
	}
	return string(encoded)
}

func stringValue(value interface{}) string {
	if value == nil {
		return ""
	}
	if text, ok := value.(string); ok {
		return text
	}
	return ""
}

func topicSuffix(topic string) string {
	parts := strings.Split(topic, "/")
	if len(parts) == 0 {
		return ""
	}
	return parts[len(parts)-1]
}

func isUUID(value string) bool {
	if len(value) != 36 {
		return false
	}
	for i, char := range value {
		switch i {
		case 8, 13, 18, 23:
			if char != '-' {
				return false
			}
		default:
			if !((char >= '0' && char <= '9') || (char >= 'a' && char <= 'f') || (char >= 'A' && char <= 'F')) {
				return false
			}
		}
	}
	return true
}

func newUUID() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		log.Printf("error generating uuid: %v", err)
		return "00000000-0000-4000-8000-000000000000"
	}
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}
