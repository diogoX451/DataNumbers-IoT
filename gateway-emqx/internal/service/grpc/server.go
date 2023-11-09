package grpc

import (
	"context"

	"github.com/gateway-emqx-datanumbers/internal/service/grpc/emqx.io/grpc/exhook"
	"github.com/gateway-emqx-datanumbers/util"
)

type Server struct {
	exhook.UnimplementedHookProviderServer
}

var cnter *util.Counter = util.NewCounter(0, 100)

func (s *Server) NewServerHook() *Server {
	return &Server{}
}

func (s *Server) OnProviderLoaded(ctx context.Context, in *exhook.ProviderLoadedRequest) (*exhook.LoadedResponse, error) {
	cnter.Count(1)
	hooks := []*exhook.HookSpec{
		{Name: "client.connect"},
		{Name: "client.connack"},
		{Name: "client.connected"},
		{Name: "client.disconnected"},
		{Name: "client.authenticate"},
		{Name: "client.authorize"},
		{Name: "client.subscribe"},
		{Name: "client.unsubscribe"},
		{Name: "session.created"},
		{Name: "session.subscribed"},
		{Name: "session.unsubscribed"},
		{Name: "session.resumed"},
		{Name: "session.discarded"},
		{Name: "session.takenover"},
		{Name: "session.terminated"},
		{Name: "message.publish"},
		{Name: "message.delivered"},
		{Name: "message.acked"},
		{Name: "message.dropped"},
	}
	return &exhook.LoadedResponse{Hooks: hooks}, nil
}

func (s *Server) OnProviderUnloaded(ctx context.Context, in *exhook.ProviderUnloadedRequest) (*exhook.EmptySuccess, error) {
	cnter.Count(1)
	return &exhook.EmptySuccess{}, nil
}

func (s *Server) OnClientConnect(ctx context.Context, in *exhook.ClientConnectRequest) (*exhook.EmptySuccess, error) {
	cnter.Count(1)
	return &exhook.EmptySuccess{}, nil
}

func (s *Server) OnClientConnack(ctx context.Context, in *exhook.ClientConnackRequest) (*exhook.EmptySuccess, error) {
	cnter.Count(1)
	return &exhook.EmptySuccess{}, nil
}

func (s *Server) OnClientConnected(ctx context.Context, in *exhook.ClientConnectedRequest) (*exhook.EmptySuccess, error) {
	cnter.Count(1)
	return &exhook.EmptySuccess{}, nil
}

func (s *Server) OnClientDisconnected(ctx context.Context, in *exhook.ClientDisconnectedRequest) (*exhook.EmptySuccess, error) {
	cnter.Count(1)
	return &exhook.EmptySuccess{}, nil
}

func (s *Server) OnClientAuthenticate(ctx context.Context, in *exhook.ClientAuthenticateRequest) (*exhook.ValuedResponse, error) {
	cnter.Count(1)
	reply := &exhook.ValuedResponse{}
	reply.Type = exhook.ValuedResponse_STOP_AND_RETURN
	reply.Value = &exhook.ValuedResponse_BoolResult{BoolResult: true}
	return reply, nil
}

func (s *Server) OnClientAuthorize(ctx context.Context, in *exhook.ClientAuthorizeRequest) (*exhook.ValuedResponse, error) {
	cnter.Count(1)
	reply := &exhook.ValuedResponse{}
	reply.Type = exhook.ValuedResponse_STOP_AND_RETURN
	reply.Value = &exhook.ValuedResponse_BoolResult{BoolResult: true}
	return reply, nil
}

func (s *Server) OnClientSubscribe(ctx context.Context, in *exhook.ClientSubscribeRequest) (*exhook.EmptySuccess, error) {
	cnter.Count(1)
	return &exhook.EmptySuccess{}, nil
}

func (s *Server) OnClientUnsubscribe(ctx context.Context, in *exhook.ClientUnsubscribeRequest) (*exhook.EmptySuccess, error) {
	cnter.Count(1)
	return &exhook.EmptySuccess{}, nil
}

func (s *Server) OnSessionCreated(ctx context.Context, in *exhook.SessionCreatedRequest) (*exhook.EmptySuccess, error) {
	cnter.Count(1)
	return &exhook.EmptySuccess{}, nil
}
func (s *Server) OnSessionSubscribed(ctx context.Context, in *exhook.SessionSubscribedRequest) (*exhook.EmptySuccess, error) {
	cnter.Count(1)
	return &exhook.EmptySuccess{}, nil
}

func (s *Server) OnSessionUnsubscribed(ctx context.Context, in *exhook.SessionUnsubscribedRequest) (*exhook.EmptySuccess, error) {
	cnter.Count(1)
	return &exhook.EmptySuccess{}, nil
}

func (s *Server) OnSessionResumed(ctx context.Context, in *exhook.SessionResumedRequest) (*exhook.EmptySuccess, error) {
	cnter.Count(1)
	return &exhook.EmptySuccess{}, nil
}

func (s *Server) OnSessionDiscarded(ctx context.Context, in *exhook.SessionDiscardedRequest) (*exhook.EmptySuccess, error) {
	cnter.Count(1)
	return &exhook.EmptySuccess{}, nil
}

func (s *Server) OnSessionTakenover(ctx context.Context, in *exhook.SessionTakenoverRequest) (*exhook.EmptySuccess, error) {
	cnter.Count(1)
	return &exhook.EmptySuccess{}, nil
}

func (s *Server) OnSessionTerminated(ctx context.Context, in *exhook.SessionTerminatedRequest) (*exhook.EmptySuccess, error) {
	cnter.Count(1)
	return &exhook.EmptySuccess{}, nil
}

func (s *Server) OnMessagePublish(ctx context.Context, in *exhook.MessagePublishRequest) (*exhook.ValuedResponse, error) {
	cnter.Count(1)
	in.Message.Payload = []byte("hardcode payload by exhook-svr-go :)")
	reply := &exhook.ValuedResponse{}
	reply.Type = exhook.ValuedResponse_STOP_AND_RETURN
	reply.Value = &exhook.ValuedResponse_Message{Message: in.Message}
	return reply, nil
}

//case2: stop publish the `t/d` messages
//func (s *Server) OnMessagePublish(ctx context.Context, in *exhook.MessagePublishRequest) (*exhook.ValuedResponse, error) {
//	cnter.Count(1)
//    if in.Message.Topic == "t/d" {
//        in.Message.Headers["allow_publish"] = "false"
//        in.Message.Payload = []byte("")
//    }
//	reply := &exhook.ValuedResponse{}
//	reply.Type = exhook.ValuedResponse_STOP_AND_RETURN
//	reply.Value = &exhook.ValuedResponse_Message{Message: in.Message}
//	return reply, nil
//}

func (s *Server) OnMessageDelivered(ctx context.Context, in *exhook.MessageDeliveredRequest) (*exhook.EmptySuccess, error) {
	cnter.Count(1)
	return &exhook.EmptySuccess{}, nil
}

func (s *Server) OnMessageDropped(ctx context.Context, in *exhook.MessageDroppedRequest) (*exhook.EmptySuccess, error) {
	cnter.Count(1)
	return &exhook.EmptySuccess{}, nil
}

func (s *Server) OnMessageAcked(ctx context.Context, in *exhook.MessageAckedRequest) (*exhook.EmptySuccess, error) {
	cnter.Count(1)
	return &exhook.EmptySuccess{}, nil
}
