package interfaces

import "github.com/nextsync/gateway-broker/internal/infra/transport/grpc/adapter/exhook"

const (
	SUCCESS        = 200
	CREATED        = 201
	NO_CONTENT     = 204
	BAD_REQUEST    = 400
	UNAUTHORIZED   = 401
	FORBIDDEN      = 403
	NOT_FOUND      = 404
	HTTPTransport  = "http"
	MQTTPTransport = "mqtt"
)

type ITransport interface {
	Configure(conn ITransportConn)
	Start() (ITransportConn, error)
	Run() error
}

type ITransportConn interface {
	Start() (ITransportConn, error)
	GroupRoute(path string, fn ...func(IGroupRoute)) IGroupRoute
	Run() error
	GetPort() string
	SetOptions(options ...interface{})
	GetOptions() interface{}
}

type IGroupRoute interface {
	Get(path string, fn ...func(IContext))
	Post(path string, fn ...func(IContext))
	Put(path string, fn ...func(IContext))
	Delete(path string, fn ...func(IContext))
}

type IContext interface {
	Param(key string) string
	BindJSON(obj interface{}) error
	JSON(code int, obj interface{})
}

type IHookProviderServer interface {
	exhook.HookProviderServer
}
