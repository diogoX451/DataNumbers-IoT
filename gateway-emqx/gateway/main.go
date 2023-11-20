package main

import (
	"fmt"
	"net"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	emqxConfig "github.com/gateway-emqx-datanumbers/internal/config/emqx"
	emqxService "github.com/gateway-emqx-datanumbers/internal/service"
	"github.com/gateway-emqx-datanumbers/internal/service/database"
	serverGrpc "github.com/gateway-emqx-datanumbers/internal/service/grpc"
	gateway_emqx "github.com/gateway-emqx-datanumbers/internal/service/grpc/emqx.io/grpc/exhook"
	"github.com/joho/godotenv"
	"google.golang.org/grpc"
)

var db *database.Postgres

func init() {
	if err := godotenv.Load(); err != nil {
		panic(err)
	}

	db = database.NewPostgres()
	db.Connect()

	serverGrpc.NewServerGRPC(db)

}

func main() {
	emqx := emqxConfig.NewEmqx("client-1")
	client := emqx.Connect()
	test := client.Subscribe(
		"topic/#",
		0,
		func(c mqtt.Client, m mqtt.Message) {
			emqxService.MessageHandler(c, m)
		},
	)

	lis, err := net.Listen("tcp", fmt.Sprintf(":%d", 5051))

	if err != nil {
		panic(err)
	}

	serverGRPC := grpc.NewServer()

	gateway_emqx.RegisterHookProviderServer(serverGRPC, &serverGrpc.Server{})

	if err := serverGRPC.Serve(lis); err != nil {
		panic(err)
	}

	token := client.Publish(
		"esp32/temperatura",
		0,
		false,
		"Hello World",
	)

	fmt.Println(test.Done())
	fmt.Println(test.Error())
	fmt.Println(token.Wait())
	fmt.Println(token.Error())

	select {}
}
