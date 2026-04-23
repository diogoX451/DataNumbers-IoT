package http

import (
	"fmt"

	"github.com/nextsync/gateway-broker/internal/interfaces"
)

var _ interfaces.ITransport = (*HTTP)(nil)

type HTTP struct {
	Conn interfaces.ITransportConn
}

func (h *HTTP) Configure(conn interfaces.ITransportConn) {
	h.Conn = conn
}

func (h *HTTP) Start() (interfaces.ITransportConn, error) {
	value, err := h.Conn.Start()

	if err != nil {
		return nil, fmt.Errorf("couldn't start http server: %w", err)
	}

	return value, nil
}

func (h *HTTP) Run() error {
	return h.Conn.Run()
}
