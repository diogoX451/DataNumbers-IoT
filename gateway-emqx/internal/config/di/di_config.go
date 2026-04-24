package di

import (
	"github.com/diogoX451/gateway-broker/cmd/routes"
	acls_service "github.com/diogoX451/gateway-broker/internal/app/services/acls"
	grpc_service "github.com/diogoX451/gateway-broker/internal/app/services/grpc"
	historys_service "github.com/diogoX451/gateway-broker/internal/app/services/historys"
	"github.com/diogoX451/gateway-broker/internal/infra/database"
	"github.com/diogoX451/gateway-broker/internal/infra/database/adapter"
	"github.com/diogoX451/gateway-broker/internal/infra/database/repository"
	"github.com/diogoX451/gateway-broker/internal/infra/messaging/nats"
	grpc_transport "github.com/diogoX451/gateway-broker/internal/infra/transport/grpc"
	grpc_adapter "github.com/diogoX451/gateway-broker/internal/infra/transport/grpc/adapter"
	"github.com/diogoX451/gateway-broker/internal/infra/transport/http"
	ginAdapter "github.com/diogoX451/gateway-broker/internal/infra/transport/http/adapter"
	mqtt_transport "github.com/diogoX451/gateway-broker/internal/infra/transport/mqtt"
	mqtt_adapter "github.com/diogoX451/gateway-broker/internal/infra/transport/mqtt/adapter"
	"github.com/diogoX451/gateway-broker/internal/interfaces"
	"go.uber.org/dig"
)

func BuildContainer() *dig.Container {
	container := dig.New()

	container.Provide(newDatabaseConnection)
	container.Provide(newPostgresDatabase)

	container.Provide(newNatsConnection)
	container.Provide(newNatsProducer)
	container.Provide(newNatsConsumer)

	container.Provide(newHTTPConnection, dig.Name("httpConn"))
	container.Provide(newMqttConnection, dig.Name("mqttConn"))
	container.Provide(newGRPCConnection, dig.Name("grpcConn"))

	container.Provide(newHTTPTransport, dig.Name("httpTransport"))

	container.Provide(newMqttTransport, dig.Name("mqttTransport"))

	container.Provide(newGRPCTransport, dig.Name("grpcTransport"))

	container.Provide(newRepositoryHistory)
	container.Provide(newServiceHistory)
	container.Provide(newGrpcService)

	container.Provide(newAclRepository)
	container.Provide(newAclService)

	container.Provide(newRouter)

	return container
}

func newDatabaseConnection() interfaces.IConn {
	return &adapter.PgxPoolAdapter{}
}

func newPostgresDatabase(conn interfaces.IConn) *database.Postgres {
	return &database.Postgres{Conn: conn}
}

func newNatsConnection() interfaces.IConnMessage {
	return &nats.NatsConnect{}
}

func newNatsProducer(conn interfaces.IConnMessage) interfaces.IProducer {
	return &nats.NatsProducer{Conn: conn}
}

func newNatsConsumer(conn interfaces.IConnMessage) interfaces.IConsumer {
	return &nats.NatsConsumer{Conn: conn}
}

func newHTTPConnection() interfaces.ITransportConn {
	return &ginAdapter.GinAdapter{}
}

func newHTTPTransport(conn struct {
	dig.In
	Conn interfaces.ITransportConn `name:"httpConn"`
}) interfaces.ITransport {
	return &http.HTTP{Conn: conn.Conn}
}

func newMqttConnection() interfaces.ITransportConn {
	return &mqtt_adapter.EmqxAdapter{}
}

func newMqttTransport(conn struct {
	dig.In
	Conn interfaces.ITransportConn `name:"mqttConn"`
}) interfaces.ITransport {
	return &mqtt_transport.Mqtt{Conn: conn.Conn}
}

func newGRPCConnection(grpcService interfaces.IHookProviderServer) interfaces.ITransportConn {
	return &grpc_adapter.GRPCEmqxAdapter{
		Service: grpcService,
	}
}

func newGRPCTransport(conn struct {
	dig.In
	Conn interfaces.ITransportConn `name:"grpcConn"`
}) interfaces.ITransport {
	return &grpc_transport.GRPC{Conn: conn.Conn}
}

func newRepositoryHistory(conn interfaces.IConn) interfaces.IHistoryRepository {
	return &repository.HistoryRepository{
		Db: conn,
	}
}

func newServiceHistory(repo interfaces.IHistoryRepository) interfaces.IHistoryService {
	return &historys_service.HistoryService{
		Repo: repo,
	}
}

func newGrpcService(service interfaces.IHistoryService) interfaces.IHookProviderServer {
	return &grpc_service.GrpcService{
		Service: service,
	}
}

func newAclRepository(conn interfaces.IConn) interfaces.IAclRepository {
	return &repository.AclsRepository{
		Db: conn,
	}
}

func newAclService(repo interfaces.IAclRepository) interfaces.IAclsService {
	return &acls_service.AclService{
		Repo: repo,
	}
}

func newRouter(
	route interfaces.IAclsService,
) *routes.Routes {
	return &routes.Routes{
		ServiceAcl: route,
	}
}
