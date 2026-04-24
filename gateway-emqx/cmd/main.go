package main

import (
	"log"
	"sync"

	"github.com/diogoX451/gateway-broker/cmd/routes"
	"github.com/diogoX451/gateway-broker/internal/app/services/stream"
	"github.com/diogoX451/gateway-broker/internal/config"
	"github.com/diogoX451/gateway-broker/internal/config/di"
	emqx_config "github.com/diogoX451/gateway-broker/internal/config/emqx"
	"github.com/diogoX451/gateway-broker/internal/infra/database"
	mqtt_adapter "github.com/diogoX451/gateway-broker/internal/infra/transport/mqtt/adapter"
	serverMqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/redis/go-redis/v9"
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
	Stream   *stream.StreamService
	Redis    *redis.Client
}) {
	var wg sync.WaitGroup
	wg.Add(2)

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

	// Adicionar rota WebSocket
	rt.GroupRoute("/api").Get("/stream", func(ctx interfaces.IContext) {
		p.Stream.HandleWS(ctx.Writer(), ctx.Request())
	})

	// Iniciar adaptador MQTT e configurar opções
	mq, err := p.Mqtt.Start()
	if err != nil {
		log.Fatalf("failed to start mqtt transport: %v", err)
	}

	// Configurar MQTT
	configMqtt := emqx_config.EmqxConfig{}
	configMqtt.SetQueue(p.Producer)
	configMqtt.SetAclService(p.Routes.ServiceAcl)
	configMqtt.SetRedis(p.Redis)

	opts := mq.GetOptions().(*serverMqtt.ClientOptions)
	configMqtt.SetConfig(opts)
	mq.SetOptions(opts)

	// Inicializar gRPC
	if err := p.Grpc.Run(); err != nil {
		log.Fatalf("failed to initialize grpc server: %v", err)
	}

	go func() {
		defer wg.Done()
		if _, err := p.Grpc.Start(); err != nil {
			log.Printf("failed to run grpc server: %v", err)
		}
	}()

	go func() {
		defer wg.Done()
		if err := mq.Run(); err != nil {
			log.Printf("failed to run mqtt client: %v", err)
			return
		}

		if emqx, ok := mq.(*mqtt_adapter.EmqxAdapter); ok {
			configMqtt.ListenToNatsCommands(p.Consumer, emqx.GetClient())
		}
	}()

	// Servidor HTTP como processo principal (bloqueante)
	if err := p.Http.Run(); err != nil {
		log.Fatalf("failed to run http server: %v", err)
	}
}
