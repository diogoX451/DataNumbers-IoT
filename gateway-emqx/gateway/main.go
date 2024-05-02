package main

import (
	"fmt"
	"log"
	"net"
	"os"

	emqxConfig "github.com/gateway-emqx-datanumbers/internal/config/emqx"
	nats_service "github.com/gateway-emqx-datanumbers/internal/config/nats"
	"github.com/gateway-emqx-datanumbers/internal/database"
	emqxService "github.com/gateway-emqx-datanumbers/internal/service"
	serverGrpc "github.com/gateway-emqx-datanumbers/internal/service/grpc"
	gateway_emqx "github.com/gateway-emqx-datanumbers/internal/service/grpc/emqx.io/grpc/exhook"
	"github.com/joho/godotenv"
	"google.golang.org/grpc"
)

var db *database.Postgres
var nats nats_service.NatsConfig

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

	nats = *nats_service.NewNatsConfig()
}

func main() {

	file, err := os.OpenFile("app.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		log.Fatalf("Failed to open log file: %v", err)
	}
	defer file.Close()

	nats.SetTopic("devices-data")
	// nats.Subscribe("", func(msg *natsService.Msg) {
	// 	string1 := string(msg.Data)
	// 	newString := strings.Replace(string1, "\"", "", -1)

	// 	decoded, err := base64.StdEncoding.DecodeString(newString)
	// 	if err != nil {
	// 		log.Printf("Error decoding message: %v", err)
	// 		return
	// 	}

	// 	log.Printf("Received message: %v", string(decoded))
	// })

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
