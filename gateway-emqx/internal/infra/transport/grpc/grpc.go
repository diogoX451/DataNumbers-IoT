package grpc_transport

import "github.com/diogoX451/gateway-broker/internal/interfaces"

var _ interfaces.ITransport = (*GRPC)(nil)

type GRPC struct {
	Conn interfaces.ITransportConn
}

func (g *GRPC) Configure(conn interfaces.ITransportConn) {
	g.Conn = conn
}

func (g *GRPC) Run() error {
	return g.Conn.Run()
}

func (g *GRPC) Start() (interfaces.ITransportConn, error) {
	value, err := g.Conn.Start()
	if err != nil {
		return nil, err
	}

	return value, nil
}
