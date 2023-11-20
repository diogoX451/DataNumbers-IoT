package pulsarConfig

import (
	"os"
	"time"

	"github.com/apache/pulsar-client-go/pulsar"
)

type Pulsar struct {
	Host string
	Port string
}

type MessagePulsar struct {
	DeviceId string
	Type     string
	Content  interface{}
}

func NewPulsar() *Pulsar {
	return &Pulsar{
		Host: os.Getenv("PULSAR_HOST"),
		Port: os.Getenv("PULSAR_PORT"),
	}
}

func (p *Pulsar) Connect() *pulsar.Client {
	client, err := pulsar.NewClient(pulsar.ClientOptions{
		URL:               "pulsar://" + p.Host + ":" + p.Port,
		OperationTimeout:  30 * time.Second,
		ConnectionTimeout: 30 * time.Second,
	})

	if err != nil {
		panic(err)
	}

	defer client.Close()

	return &client
}

// func (m *MessagePulsar) SendMessage(client) error {

// 	codec, err := goavro.NewCodec(`
// 		{
// 			"type": "message",
// 			"a
// 		}
// 	`)

// }
