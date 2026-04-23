package grpc_adapter

import (
	"fmt"
	"net"

	"github.com/nextsync/gateway-broker/internal/infra/transport/grpc/adapter/exhook"
	"github.com/nextsync/gateway-broker/internal/interfaces"
	"google.golang.org/grpc"
)

var _ interfaces.ITransportConn = (*GRPCEmqxAdapter)(nil)

type GRPCEmqxAdapter struct {
	rpc     *grpc.Server
	Service interfaces.IHookProviderServer
}

func (g *GRPCEmqxAdapter) Run() error {
	g.rpc = grpc.NewServer()
	return nil
}

func (g *GRPCEmqxAdapter) Start() (interfaces.ITransportConn, error) {
	if g.rpc == nil {
		return nil, fmt.Errorf("gRPC server not initialized")
	}

	if g.Service == nil {
		return nil, fmt.Errorf("service not initialized")
	}

	hook := g.Service
	tcp, err := net.Listen("tcp", fmt.Sprintf(":%d", 5051))

	if err != nil {
		return nil, fmt.Errorf("failed to start TCP listener: %w", err)
	}

	exhook.RegisterHookProviderServer(g.rpc, hook)
	if err := g.rpc.Serve(tcp); err != nil {
		return nil, fmt.Errorf("failed to serve gRPC: %w", err)
	}

	fmt.Println("gRPC server started")

	return g, nil
}

// SetOptions implements interfaces.ITransportConn.
func (g *GRPCEmqxAdapter) SetOptions(options ...interface{}) {
	panic("unimplemented")
}

// GetOptions implements interfaces.ITransportConn.
func (g *GRPCEmqxAdapter) GetOptions() interface{} {
	panic("unimplemented")
}

// GetPort implements interfaces.ITransportConn.
func (g *GRPCEmqxAdapter) GetPort() string {
	panic("unimplemented")
}

// GroupRoute implements interfaces.ITransportConn.
func (g *GRPCEmqxAdapter) GroupRoute(path string, fn ...func(interfaces.IGroupRoute)) interfaces.IGroupRoute {
	panic("unimplemented")
}
