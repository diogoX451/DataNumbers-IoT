package main

import (
	"fmt"
	"log"
	"net"
	"os"

	emqxConfig "github.com/gateway-emqx/gateway-emqx/internal/config/emqx"
	nats_service "github.com/gateway-emqx/gateway-emqx/internal/config/nats"
	"github.com/gateway-emqx/gateway-emqx/internal/database"
	"github.com/gateway-emqx/gateway-emqx/internal/providers"
	emqxService "github.com/gateway-emqx/gateway-emqx/internal/service"
	serverGrpc "github.com/gateway-emqx/gateway-emqx/internal/service/grpc"
	gateway_emqx "github.com/gateway-emqx/gateway-emqx/internal/service/grpc/emqx.io/grpc/exhook"
	"github.com/joho/godotenv"
	"google.golang.org/grpc"
)

var db database.Database
var nats nats_service.NatsConfig

func init() {

	err := godotenv.Load()
	if err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	dbProvider := providers.NewDatabaseProviders()
	db = dbProvider.Connect()

	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	nats = *nats_service.NewNatsConfig()
}

func main() {

	file, err := os.OpenFile("app.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		log.Fatalf("Failed to open log file: %v", err)
	}

	defer file.Close()

	nats.SetTopic("devices-data")
	nats.Connect.Flush()

	emqx := emqxConfig.NewEmqx(emqxService.NewServiceEmqx(nats.Publish))
	emqx.Connect()

	defer db.Close()

	lis, err := net.Listen("tcp", fmt.Sprintf(":%d", 5051))
	if err != nil {
		log.Printf("Failed to listen: %v", err)
	}

	serverGRPC := grpc.NewServer()
	server := serverGrpc.NewServerGRPC(db)
	gateway_emqx.RegisterHookProviderServer(serverGRPC, &server)

	go func() {
		if err := serverGRPC.Serve(lis); err != nil {
			log.Printf("Failed to serve gRPC: %v", err)
		}
	}()

	<-make(chan struct{})
}
