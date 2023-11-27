package pulsarConfig

import (
	"log"
	"os"
	"time"

	"github.com/apache/pulsar-client-go/pulsar"
)

type Pulsar struct {
	Host string
	Port string
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
		OperationTimeout:  50 * time.Second,
		ConnectionTimeout: 50 * time.Second,
	})

	if err != nil {
		log.Fatalf("Could not instantiate Pulsar client: %v", err)
	}

	return &client
}
