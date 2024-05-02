package emqxService

import (
	mqtt "github.com/eclipse/paho.mqtt.golang"
)

type ClientQuee func(client mqtt.Client, msg mqtt.Message)

type ServiceEmqx struct {
	ClientQuee ClientQuee
}

func NewServiceEmqx(pc ClientQuee) *ServiceEmqx {
	return &ServiceEmqx{
		ClientQuee: pc,
	}
}

// var (
// 	schemaDef = "{\"type\":\"record\",\"name\":\"data_emqx\",\"namespace\":\"gateway_emqx\"," +
// 		"\"fields\":[{\"name\":\"topic\",\"type\":\"string\"},{\"name\":\"payload\",\"type\":\"string\"}]}"
// )

func (s *ServiceEmqx) MessageHandler(client mqtt.Client, msg mqtt.Message) {
	s.ClientQuee(client, msg)
}

// func (s *ServiceEmqx) InitializeProducer() {
// 	// properties := map[string]string{}
// 	// jsonSchema := pulsar.NewJSONSchema(schemaDef, properties)

// 	producer, err := s.pulsarClient.CreateProducer(pulsar.ProducerOptions{
// 		Topic: "devices-data",
// 		Name:  "devices",
// 	})
// 	if err != nil {
// 		log.Fatalf("Could not instantiate Pulsar producer: %v", err)
// 	}

// 	s.producer = producer
// }

// func (s *ServiceEmqx) CloseProducer() {
// 	if s.producer != nil {
// 		s.producer.Close()
// 	}
// }
