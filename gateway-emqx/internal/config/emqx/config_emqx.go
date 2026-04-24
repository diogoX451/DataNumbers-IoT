package emqx_config

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/diogoX451/gateway-broker/internal/config"
	"github.com/diogoX451/gateway-broker/internal/interfaces"
	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/redis/go-redis/v9"
)

type EmqxConfig struct {
	config     *mqtt.ClientOptions
	queue      interfaces.IProducer
	aclService interfaces.IAclsService
	redis      *redis.Client
}

func (e *EmqxConfig) SetRedis(r *redis.Client) {
	e.redis = r
}

func (e *EmqxConfig) GetConfig() *mqtt.ClientOptions {
	return e.config
}

func (e *EmqxConfig) SetAclService(service interfaces.IAclsService) {
	e.aclService = service
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
	options.SetClientID(fmt.Sprintf("gateway-%s", newUUID()[:8]))
	options.AddBroker(fmt.Sprintf("tcp://%s:%s", config.Get("HOST_EMQX"), config.Get("PORT_EMQX")))
	options.OnConnect = func(client mqtt.Client) {
		topics := config.GetYaml().Queue.Topics
		log.Printf("Gateway connected to EMQX. Subscribing to: %s/#", topics.GatewayData)
		client.Subscribe(topics.GatewayData+"/#", 0, func(client mqtt.Client, msg mqtt.Message) {
			log.Printf("Gateway received MQTT message on topic: %s", msg.Topic())
			envelope := e.buildTelemetryEnvelope(msg.Topic(), msg.Payload())
			log.Printf("Gateway publishing to NATS: %s", envelope)
			err := e.queue.Publish(topics.TelemetryReceived, 0, false, envelope)
			if err != nil {
				log.Printf("ERROR: Failed to publish to NATS: %v", err)
			} else {
				log.Printf("Successfully published telemetry to NATS topic: %s", topics.TelemetryReceived)
			}
		})
	}

	e.config = options
}

func (e *EmqxConfig) ListenToNatsCommands(consumer interfaces.IConsumer, client mqtt.Client) {
	log.Println("Gateway listening for NATS commands on: iot.command.send")
	consumer.Subscribe("iot.command.send", 0, func(topic string, payload []byte) {
		var command map[string]any
		if err := json.Unmarshal(payload, &command); err != nil {
			log.Printf("Error unmarshalling NATS command: %v", err)
			return
		}
		commandTopic, _ := command["command_topic"].(string)
		payloadData, _ := json.Marshal(command["payload"])
		if commandTopic != "" {
			token := client.Publish(commandTopic, 0, false, payloadData)
			token.Wait()
			log.Printf("Forwarded command from NATS to MQTT topic: %s", commandTopic)
		}
	})
}

func (e *EmqxConfig) buildTelemetryEnvelope(topic string, raw []byte) string {
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
		// Tentar buscar o mapeamento Tópico -> UUID no Redis
		if e.redis != nil {
			val, err := e.redis.Get(context.Background(), fmt.Sprintf("topic:%s", topic)).Result()
			if err == nil {
				deviceID = val
			}
		}
		
		// Fallback para o sufixo se não encontrar no Redis
		if deviceID == "" {
			deviceID = topicSuffix(topic)
		}
	}
	if !isUUID(deviceID) {
		deviceID = "00000000-0000-0000-0000-000000000000"
	}

	templateID := stringValue(body["template_id"])
	tenantID := stringValue(body["tenant_id"])

	// Enriquecimento via Redis
	if e.redis != nil && isUUID(deviceID) && (templateID == "" || tenantID == "") {
		val, err := e.redis.Get(context.Background(), fmt.Sprintf("device:%s", deviceID)).Result()
		if err == nil {
			var metadata map[string]string
			if json.Unmarshal([]byte(val), &metadata) == nil {
				if tenantID == "" {
					tenantID = metadata["tenant_id"]
				}
				if templateID == "" {
					templateID = metadata["template_id"]
				}
			}
		}
	}

	if !isUUID(templateID) {
		templateID = "00000000-0000-0000-0000-000000000000"
	}
	if !isUUID(tenantID) {
		tenantID = "00000000-0000-0000-0000-000000000000"
	}

	envelope := map[string]interface{}{
		"event_id":       newUUID(),
		"device_id":      deviceID,
		"template_id":    templateID,
		"tenant_id":      tenantID,
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
