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

func (s *ServiceEmqx) MessageHandler(client mqtt.Client, msg mqtt.Message) {
	s.ClientQuee(client, msg)
}
