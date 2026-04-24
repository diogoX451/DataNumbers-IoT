package nats

import (
	"fmt"

	"github.com/diogoX451/gateway-broker/internal/interfaces"
)

var _ interfaces.IProducer = (*NatsProducer)(nil)

type NatsProducer struct {
	Conn interfaces.IConnMessage
}

func (n *NatsProducer) Publish(topic string, qos byte, retained bool, payload interface{}) error {
	if n.Conn.GetTopic() == "" && topic != "" {
		n.Conn.SetTopic(topic)
	}

	if err := n.Conn.Connect(); err != nil {
		return fmt.Errorf("couldn't connect to NATS: %w", err)
	}

	natsConn := n.Conn.(*NatsConnect).conn
	if err := natsConn.Publish(n.Conn.GetTopic(), []byte(payload.(string))); err != nil {
		return fmt.Errorf("couldn't publish message: %w", err)
	}

	fmt.Printf("Published message to topic %s\n", n.Conn.GetTopic())
	return nil
}
