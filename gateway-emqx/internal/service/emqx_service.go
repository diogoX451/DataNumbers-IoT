package emqxService

import (
	"context"
	"encoding/json"
	"log"

	"github.com/apache/pulsar-client-go/pulsar"
	mqtt "github.com/eclipse/paho.mqtt.golang"
)

type ServiceEmqx struct {
	pulsarClient pulsar.Client
	producer     pulsar.Producer
}

func NewServiceEmqx(pc pulsar.Client) *ServiceEmqx {
	return &ServiceEmqx{
		pulsarClient: pc,
	}
}

// var (
// 	schemaDef = "{\"type\":\"record\",\"name\":\"data_emqx\",\"namespace\":\"gateway_emqx\"," +
// 		"\"fields\":[{\"name\":\"topic\",\"type\":\"string\"},{\"name\":\"payload\",\"type\":\"string\"}]}"
// )

func (s *ServiceEmqx) MessageHandler(client mqtt.Client, msg mqtt.Message) {
	msgBytes, err := json.Marshal(msg.Payload())
	if err != nil {
		log.Printf("Error serializing message: %v", err)
		return
	}

	_, err = s.producer.Send(context.Background(), &pulsar.ProducerMessage{
		Payload: msgBytes,
	})

	if err != nil {
		log.Printf("Could not send message: %v", err)
		return
	}

}

func (s *ServiceEmqx) InitializeProducer() {
	// properties := map[string]string{}
	// jsonSchema := pulsar.NewJSONSchema(schemaDef, properties)

	producer, err := s.pulsarClient.CreateProducer(pulsar.ProducerOptions{
		Topic: "devices",
	})
	if err != nil {
		log.Fatalf("Could not instantiate Pulsar producer: %v", err)
	}

	s.producer = producer
}

func (s *ServiceEmqx) CloseProducer() {
	if s.producer != nil {
		s.producer.Close()
	}
}
