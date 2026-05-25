package nats

import (
	"fmt"

	"github.com/diogoX451/gateway-broker/internal/interfaces"
	"github.com/nats-io/nats.go"
)

var _ interfaces.IConsumer = (*NatsConsumer)(nil)

type NatsConsumer struct {
	Conn interfaces.IConnMessage
}

func (n *NatsConsumer) Subscribe(topic string, qos byte, callback func(topic string, payload []byte)) error {
	if err := n.Conn.Connect(); err != nil {
		return fmt.Errorf("couldn't connect to NATS: %w", err)
	}

	if topic == "" {
		return fmt.Errorf("subscribe topic is required")
	}

	// Não tocar em n.Conn.SetTopic — esse campo é compartilhado e seria
	// confundido com o subject de outras chamadas no mesmo NatsConnect.
	connect := n.Conn.(*NatsConnect)
	_, err := connect.GetConn().Subscribe(topic, func(msg *nats.Msg) {
		fmt.Printf("Received message on topic %s\n", msg.Subject)
		callback(msg.Subject, msg.Data)
	})
	if err != nil {
		return fmt.Errorf("couldn't subscribe to topic: %w", err)
	}

	fmt.Printf("Subscribed to topic %s\n", topic)
	return nil
}
