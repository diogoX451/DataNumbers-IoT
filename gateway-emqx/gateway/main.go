package main

import (
	"fmt"
	"log"
	"net"
	"os"

	"github.com/apache/pulsar-client-go/pulsar"
	emqxConfig "github.com/gateway-emqx-datanumbers/internal/config/emqx"
	pulsarConfig "github.com/gateway-emqx-datanumbers/internal/config/pulsar"
	"github.com/gateway-emqx-datanumbers/internal/database"
	emqxService "github.com/gateway-emqx-datanumbers/internal/service"
	serverGrpc "github.com/gateway-emqx-datanumbers/internal/service/grpc"
	gateway_emqx "github.com/gateway-emqx-datanumbers/internal/service/grpc/emqx.io/grpc/exhook"
	"github.com/joho/godotenv"
	"google.golang.org/grpc"
)

var db *database.Postgres
var client pulsar.Client

func init() {

	err := godotenv.Load()
	if err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	db = database.NewPostgres()
	err = db.Connect()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	db.SetConnection(int32(2))
	db.SetMinConnections(int32(2))

	client = *pulsarConfig.NewPulsar().Connect()
	if err != nil {
		log.Fatalf("Failed to connect to Pulsar: %v", err)
	}
}

func main() {

	file, err := os.OpenFile("app.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		log.Fatalf("Failed to open log file: %v", err)
	}
	defer file.Close()

	emqx := emqxConfig.NewEmqx(emqxService.NewServiceEmqx(client))
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
