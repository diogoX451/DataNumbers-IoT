package grpc_service

import (
	"context"
	"log"

	"github.com/diogoX451/gateway-broker/internal/app/util"
	"github.com/diogoX451/gateway-broker/internal/domain/entities"
	"github.com/diogoX451/gateway-broker/internal/infra/transport/grpc/adapter/exhook"
	"github.com/diogoX451/gateway-broker/internal/infra/transport/grpc/adapter/validation"
	"github.com/diogoX451/gateway-broker/internal/interfaces"
)

type GrpcService struct {
	exhook.UnimplementedHookProviderServer
	HistoryService interfaces.IHistoryService
	AclService     interfaces.IAclsService
	Db             interfaces.IConn
}

var counter *util.Counter = util.NewCounter(0, 100)

func (s *GrpcService) OnProviderLoaded(ctx context.Context, in *exhook.ProviderLoadedRequest) (*exhook.LoadedResponse, error) {
	counter.Count(1)

	hooks := []*exhook.HookSpec{
		{Name: "message.publish"},
		{Name: "client.connected"},
		{Name: "client.disconnected"},
	}

	return &exhook.LoadedResponse{Hooks: hooks}, nil
}

func (s *GrpcService) OnClientConnected(ctx context.Context, in *exhook.ClientConnectedRequest) (*exhook.EmptySuccess, error) {
	clientID := in.Clientinfo.Clientid
	if clientID != "gateway" {
		log.Printf("Device connected: %s", clientID)
		s.updateDeviceStatus(clientID, "ONLINE")
	}
	return &exhook.EmptySuccess{}, nil
}

func (s *GrpcService) OnClientDisconnected(ctx context.Context, in *exhook.ClientDisconnectedRequest) (*exhook.EmptySuccess, error) {
	clientID := in.Clientinfo.Clientid
	if clientID != "gateway" {
		log.Printf("Device disconnected: %s", clientID)
		s.updateDeviceStatus(clientID, "OFFLINE")
	}
	return &exhook.EmptySuccess{}, nil
}

func (s *GrpcService) updateDeviceStatus(clientID string, status string) {
	conn, err := s.Db.Open()
	if err != nil {
		return
	}
	defer conn.Close()

	// O clientID é usado no tópico: gateway.data/{clientID}
	// Mas o device_id real pode ser diferente. Vamos tentar atualizar pelo mqtt_topic que contém o clientID
	topicSuffix := "gateway.data/" + clientID
	err = conn.Exec("UPDATE device_manager.devices SET device_status = $1, updated_at = now() WHERE mqtt_topic = $2 OR device_id::text = $3", status, topicSuffix, clientID)
	if err != nil {
		log.Printf("Error updating device status: %v", err)
	}
}

func (s *GrpcService) OnMessagePublish(ctx context.Context, in *exhook.MessagePublishRequest) (*exhook.ValuedResponse, error) {
	counter.Count(1)
	reply := &exhook.ValuedResponse{}

	// Responder imediatamente ao EMQX para evitar timeout
	reply.Type = exhook.ValuedResponse_STOP_AND_RETURN
	reply.Value = &exhook.ValuedResponse_Message{Message: in.Message}

	// Processar histórico e validação em background
	go func(msg *exhook.Message) {
		format := validation.NewData(msg.Topic, msg.Payload)
		if !format.Validate() {
			username := "anonymous"
			if msg.Headers["username"] != "" {
				username = msg.Headers["username"]
			}
			s.HistoryService.Create(entities.History{
				Observation: "Message format invalid",
				Type:        "error",
				Username:    username,
				Topic:       msg.Topic,
			})
			return
		}

		s.HistoryService.Create(entities.History{
			Observation: "Message published",
			Type:        "success",
			Username:    msg.Headers["username"],
			Topic:       msg.Topic,
		})
	}(in.Message)

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
	return s.HistoryService.Create(data)
}
