package grpc_service

import (
	"context"
	"log"

	"github.com/nextsync/gateway-broker/internal/app/util"
	"github.com/nextsync/gateway-broker/internal/domain/entities"
	"github.com/nextsync/gateway-broker/internal/infra/transport/grpc/adapter/exhook"
	"github.com/nextsync/gateway-broker/internal/infra/transport/grpc/adapter/validation"
	"github.com/nextsync/gateway-broker/internal/interfaces"
)

type GrpcService struct {
	exhook.UnimplementedHookProviderServer
	Service interfaces.IHistoryService
}

var counter *util.Counter = util.NewCounter(0, 100)

func (s *GrpcService) OnProviderLoaded(ctx context.Context, in *exhook.ProviderLoadedRequest) (*exhook.LoadedResponse, error) {
	counter.Count(1)

	hooks := []*exhook.HookSpec{
		{Name: "message.publish"},
		{Name: "message.delivered"},
		{Name: "message.acked"},
		{Name: "message.dropped"},
	}

	return &exhook.LoadedResponse{Hooks: hooks}, nil
}

func (s *GrpcService) OnMessagePublish(ctx context.Context, in *exhook.MessagePublishRequest) (*exhook.ValuedResponse, error) {
	counter.Count(1)
	reply := &exhook.ValuedResponse{}

	format := validation.NewData(
		in.Message.Topic,
		in.Message.Payload,
	)

	if !format.Validate() {
		username := "anonymous"
		if in.Message.Headers["username"] != "" {
			username = in.Message.Headers["username"]
		}

		err := s.history(entities.History{
			Observation: "Message format invalid",
			Type:        "error",
			Username:    username,
			Topic:       in.Message.Topic,
		})

		if err != nil {
			log.Fatalf("error to create history: %v", err)
		}

		in.Message.Headers["allow_publish"] = "false"
		in.Message.Payload = []byte("")
		reply.Type = exhook.ValuedResponse_STOP_AND_RETURN
		reply.Value = &exhook.ValuedResponse_Message{Message: in.Message}
		return reply, nil
	}

	reply.Type = exhook.ValuedResponse_STOP_AND_RETURN
	reply.Value = &exhook.ValuedResponse_Message{Message: in.Message}

	s.history(entities.History{
		Observation: "Message published",
		Type:        "success",
		Username:    in.Message.Headers["username"],
		Topic:       in.Message.Topic,
	})

	return reply, nil

}

func (s *GrpcService) OnMessageDelivered(ctx context.Context, in *exhook.MessageDeliveredRequest) (*exhook.EmptySuccess, error) {
	counter.Count(1)
	return &exhook.EmptySuccess{}, nil
}

func (s *GrpcService) OnMessageDropped(ctx context.Context, in *exhook.MessageDroppedRequest) (*exhook.EmptySuccess, error) {
	counter.Count(1)

	username := "anonymous"
	if in.Message.Headers["username"] != "" {
		username = in.Message.Headers["username"]
	}

	err := s.history(entities.History{
		Observation: "Message dropped",
		Type:        "error",
		Username:    username,
		Topic:       in.Message.Topic,
	})

	if err != nil {
		log.Fatalf("error to create history: %v", err)
	}

	return &exhook.EmptySuccess{}, nil
}

func (s *GrpcService) OnMessageAcked(ctx context.Context, in *exhook.MessageAckedRequest) (*exhook.EmptySuccess, error) {
	counter.Count(1)
	return &exhook.EmptySuccess{}, nil
}

func (s *GrpcService) history(data entities.History) error {
	return s.Service.Create(data)
}
