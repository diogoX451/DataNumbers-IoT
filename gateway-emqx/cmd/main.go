package main

import (
	"log"
	"sync"

	"github.com/diogoX451/gateway-broker/cmd/routes"
	"github.com/diogoX451/gateway-broker/internal/config"
	"github.com/diogoX451/gateway-broker/internal/config/di"
	emqx_config "github.com/diogoX451/gateway-broker/internal/config/emqx"
	"github.com/diogoX451/gateway-broker/internal/infra/database"
	serverMqtt "github.com/eclipse/paho.mqtt.golang"
	"go.uber.org/dig"

	"github.com/diogoX451/gateway-broker/internal/interfaces"
)

func init() {
	if err := config.Load(); err != nil {
		log.Fatalf("failed to load config: %v", err)
	}
}

func main() {
	container := di.BuildContainer()

	err := container.Invoke(run)

	if err != nil {
		log.Fatalf("failed to invoke container: %v", err)
	}

}

func run(p struct {
	dig.In

	Http     interfaces.ITransport `name:"httpTransport"`
	Mqtt     interfaces.ITransport `name:"mqttTransport"`
	Grpc     interfaces.ITransport `name:"grpcTransport"`
	Db       *database.Postgres
	Producer interfaces.IProducer
	Consumer interfaces.IConsumer
	Routes   *routes.Routes
}) {
	var wg sync.WaitGroup
	wg.Add(3)

	conn, err := p.Db.Open()
	if err != nil {
		log.Fatalf("failed to open database connection: %v", err)
	}

	defer conn.Close()

	rt, err := p.Http.Start()
	if err != nil {
		log.Fatalf("failed to start http server: %v", err)
	}

	p.Routes.SetupRoutes(rt)

	mq, err := p.Mqtt.Start()
	if err != nil {
		log.Fatalf("failed to start mqtt server: %v", err)
	}

	config := emqx_config.EmqxConfig{}
	config.SetQueue(p.Producer)
	config.SetConfig(mq.GetOptions().(*serverMqtt.ClientOptions))

	mq.SetOptions(config.GetConfig())

	err = p.Grpc.Run()
	if err != nil {
		log.Fatalf("failed to start grpc server: %v", err)
	}

	go func() {
		defer wg.Done()
		if err := p.Mqtt.Run(); err != nil {
			log.Fatalf("failed to run mqtt server: %v", err)
		}
	}()

	go func() {
		defer wg.Done()
		if _, err := p.Grpc.Start(); err != nil {
			log.Fatalf("failed to run grpc server: %v", err)
		}
	}()

	go func() {
		defer wg.Done()
		if err := p.Http.Run(); err != nil {
			log.Fatalf("failed to run http server: %v", err)
		}
	}()

	wg.Wait()
}
