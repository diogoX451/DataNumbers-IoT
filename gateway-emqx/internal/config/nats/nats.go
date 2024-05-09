package nats_service

import (
	"encoding/json"
	"log"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/nats-io/nats.go"
)

type NatsConfig struct {
	Connect *nats.Conn
	Topic   string
}

func NewNatsConfig() *NatsConfig {
	nc, err := nats.Connect("nats://localhost:4222")
	if err != nil {
		panic(err)
	}

	return &NatsConfig{
		Connect: nc,
	}
}

func (n *NatsConfig) Close() {
	n.Connect.Close()
}

func (n *NatsConfig) SetTopic(topic string) {
	n.Topic = topic
}

func (n *NatsConfig) Publish(client mqtt.Client, msg mqtt.Message) {
	if n.Topic == "" {
		panic("topic is required")
	}

	msgBytes, err := json.Marshal(msg.Payload())
	if err != nil {
		log.Printf("Error serializing message: %v", err)
		return
	}

	n.Connect.Publish(n.Topic, []byte(msgBytes))
}

func (n *NatsConfig) Subscribe(topic string, callback func(msg *nats.Msg)) {
	if topic != "" {
		n.Topic = topic
	}

	n.Connect.Subscribe(n.Topic, callback)
}
