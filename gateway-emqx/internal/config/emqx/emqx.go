package emqxConfig

import (
	"os"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"
)

type Emqx struct {
	Host     string
	Port     string
	ClientID string
	Options  *mqtt.ClientOptions
}

func NewEmqx(clientID string) *Emqx {
	if clientID == "" {
		clientID = "client-" + time.Now().Format("20060102150405")
	}

	options := mqtt.NewClientOptions().AddBroker("tcp://localhost:1883").SetClientID(clientID)

	return &Emqx{
		Host:     os.Getenv("EMQX_HOST"),
		Port:     os.Getenv("EMQX_PORT"),
		ClientID: clientID,
		Options:  options,
	}
}

func (e *Emqx) Connect() mqtt.Client {
	client := mqtt.NewClient(e.Options)
	if token := client.Connect(); token.Wait() && token.Error() != nil {
		panic(token.Error())
	}

	return client
}
