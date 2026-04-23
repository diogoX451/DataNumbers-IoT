package emqx_config

import (
	"fmt"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/nextsync/gateway-broker/internal/config"
	"github.com/nextsync/gateway-broker/internal/interfaces"
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
		client.Subscribe(config.GetYaml().Queue.Topics.GatewayData+"/#", 0, func(client mqtt.Client, msg mqtt.Message) {
			e.queue.Publish(config.GetYaml().Queue.Topics.GatewayData, 0, false, string(msg.Payload()))
		})
	}

	e.config = options
}
