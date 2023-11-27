package emqxConfig

import (
	"os"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	emqxService "github.com/gateway-emqx-datanumbers/internal/service"
)

type Emqx struct {
	Host    string
	Port    string
	Options *mqtt.ClientOptions
}

func NewEmqx(pc *emqxService.ServiceEmqx) *Emqx {
	options := mqtt.NewClientOptions().AddBroker("tcp://localhost:1883")
	options.AutoReconnect = true
	options.Username = "gateway-emqx"
	pc.InitializeProducer()
	options.OnConnect = func(client mqtt.Client) {
		client.Subscribe("topic/#", 0, func(c mqtt.Client, m mqtt.Message) {
			pc.MessageHandler(c, m)
		})
	}

	return &Emqx{
		Host:    os.Getenv("EMQX_HOST"),
		Port:    os.Getenv("EMQX_PORT"),
		Options: options,
	}
}

func (e *Emqx) Connect() mqtt.Client {
	client := mqtt.NewClient(e.Options)
	if token := client.Connect(); token.Wait() && token.Error() != nil {
		panic(token.Error())
	}

	return client
}
