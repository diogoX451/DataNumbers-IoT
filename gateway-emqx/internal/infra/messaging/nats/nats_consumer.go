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
	if n.Conn.GetTopic() == "" && topic != "" {
		n.Conn.SetTopic(topic)
	}

	if err := n.Conn.Connect(); err != nil {
		return fmt.Errorf("couldn't connect to NATS: %w", err)
	}

	connect := n.Conn.(*NatsConnect)
	_, err := connect.GetConn().Subscribe(n.Conn.GetTopic(), func(msg *nats.Msg) {
		fmt.Printf("Received message on topic %s\n", msg.Subject)
		callback(msg.Subject, msg.Data)
	})
	if err != nil {
		return fmt.Errorf("couldn't subscribe to topic: %w", err)
	}

	fmt.Printf("Subscribed to topic %s\n", n.Conn.GetTopic())
	return nil
}
