package mqtt_adapter

import (
	"fmt"

	"github.com/diogoX451/gateway-broker/internal/config"
	"github.com/diogoX451/gateway-broker/internal/interfaces"
	mqtt "github.com/eclipse/paho.mqtt.golang"
)

var _ interfaces.ITransportConn = (*EmqxAdapter)(nil)

type EmqxAdapter struct {
	client  mqtt.Client
	options *mqtt.ClientOptions
}

func (e *EmqxAdapter) GetPort() string {
	return config.Get("EMQX_PORT")
}

func (e *EmqxAdapter) Start() (interfaces.ITransportConn, error) {
	return e, nil
}

func (e *EmqxAdapter) SetOptions(options ...interface{}) {
	if len(options) == 0 {
		return
	}

	opts, ok := options[0].(*mqtt.ClientOptions)
	if !ok {
		fmt.Println("Invalid options")
	}

	e.options = opts
}

// GroupRoute implements interfaces.ITransportConn.
func (e *EmqxAdapter) GroupRoute(path string, fn ...func(interfaces.IGroupRoute)) interfaces.IGroupRoute {
	panic("unimplemented")
}

func (e *EmqxAdapter) GetOptions() interface{} {
	return mqtt.NewClientOptions()
}

func (e *EmqxAdapter) Run() error {
	start := mqtt.NewClient(e.options)
	if token := start.Connect(); token.Wait() && token.Error() != nil {
		return token.Error()
	}

	e.client = start
	return nil
}
