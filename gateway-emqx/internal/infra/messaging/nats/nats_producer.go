package nats

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/diogoX451/gateway-broker/internal/interfaces"
	natsgo "github.com/nats-io/nats.go"
)

var _ interfaces.IProducer = (*NatsProducer)(nil)

type NatsProducer struct {
	Conn interfaces.IConnMessage
	// js é resolvido na primeira Publish() e cacheado. Se o broker não tiver
	// JetStream habilitado, mantemos fallback para core publish para nunca
	// quebrar o caminho da telemetria.
	js natsgo.JetStreamContext
}

func (n *NatsProducer) Publish(topic string, qos byte, retained bool, payload interface{}) error {
	if err := n.Conn.Connect(); err != nil {
		return fmt.Errorf("couldn't connect to NATS: %w", err)
	}

	natsConn := n.Conn.(*NatsConnect).conn

	// O subject usa SEMPRE o argumento. NÃO consultar n.Conn.GetTopic(): esse
	// campo é compartilhado com o consumer e tinha causado o producer publicar
	// no subject do consumer (`iot.command.send`) em vez de
	// `iot.telemetry.received`.
	subject := topic
	if subject == "" {
		return fmt.Errorf("publish topic is required")
	}

	str, ok := payload.(string)
	if !ok {
		return fmt.Errorf("payload must be string, got %T", payload)
	}
	body := []byte(str)

	if n.js == nil {
		if js, err := natsConn.JetStream(); err == nil {
			n.js = js
		}
	}

	if n.js != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		_, err := n.js.Publish(subject, body, natsgo.Context(ctx))
		cancel()
		if err == nil {
			return nil
		}
		log.Printf("jetstream publish to %s failed (%v), falling back to core publish", subject, err)
	}

	if err := natsConn.Publish(subject, body); err != nil {
		return fmt.Errorf("couldn't publish message: %w", err)
	}
	return nil
}
