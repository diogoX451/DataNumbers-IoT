package nats

import (
	"fmt"

	"github.com/nats-io/nats.go"
	"github.com/nextsync/gateway-broker/internal/interfaces"
)

var _ interfaces.IConnMessage = (*NatsConnect)(nil)

type NatsConnect struct {
	conn  *nats.Conn
	topic string
}

func (n *NatsConnect) Connect() error {
	if n.conn == nil {
		var err error
		n.conn, err = nats.Connect(nats.DefaultURL)
		if err != nil {
			return err
		}
		fmt.Println("Connected to NATS")
	}
	return nil
}

func (n *NatsConnect) Close() {
	if n.conn != nil {
		n.conn.Close()
	}
}

func (n *NatsConnect) SetTopic(topic string) {
	n.topic = topic
}

func (n *NatsConnect) GetTopic() string {
	return n.topic
}

func (n *NatsConnect) GetConn() *nats.Conn {
	return n.conn
}
