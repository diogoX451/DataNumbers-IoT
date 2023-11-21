package main

import (
	"fmt"
	"net"

	emqxConfig "github.com/gateway-emqx-datanumbers/internal/config/emqx"
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
	db.SetConnection(int32(2))
	db.SetMinConnections(int32(2))

}

func main() {
	emqx := emqxConfig.NewEmqx()
	emqx.Connect()

	defer db.Close()

	lis, err := net.Listen("tcp", fmt.Sprintf(":%d", 5051))

	if err != nil {
		panic(err)
	}

	serverGRPC := grpc.NewServer()
	server := serverGrpc.NewServerGRPC(db)
	gateway_emqx.RegisterHookProviderServer(serverGRPC, &server)

	if err := serverGRPC.Serve(lis); err != nil {
		panic(err)
	}

	select {}
}
