package mqtt_transport

import (
	"fmt"

	"github.com/diogoX451/gateway-broker/internal/interfaces"
)

var _ interfaces.ITransport = (*Mqtt)(nil)

type Mqtt struct {
	Conn interfaces.ITransportConn
}

func (m *Mqtt) Configure(conn interfaces.ITransportConn) {
	m.Conn = conn
}

func (m *Mqtt) Run() error {
	return m.Conn.Run()
}

func (m *Mqtt) Start() (interfaces.ITransportConn, error) {
	value, err := m.Conn.Start()
	fmt.Println("Starting mqtt server")
	if err != nil {
		return nil, fmt.Errorf("couldn't start mqtt server: %w", err)
	}

	return value, nil
}
