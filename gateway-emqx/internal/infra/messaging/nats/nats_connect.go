package nats

import (
	"fmt"
	"os"

	"github.com/diogoX451/gateway-broker/internal/interfaces"
	"github.com/nats-io/nats.go"
)

var _ interfaces.IConnMessage = (*NatsConnect)(nil)

type NatsConnect struct {
	conn  *nats.Conn
	topic string
}

func (n *NatsConnect) Connect() error {
	if n.conn == nil {
		var err error
		url := os.Getenv("NATS_URL")
		if url == "" {
			url = nats.DefaultURL
		}
		n.conn, err = nats.Connect(url)
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
