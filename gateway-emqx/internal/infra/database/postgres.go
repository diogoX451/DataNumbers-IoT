package database

import (
	"fmt"

	"github.com/diogoX451/gateway-broker/internal/interfaces"
)

var _ interfaces.IDatabase = (*Postgres)(nil)

type Postgres struct {
	Conn interfaces.IConn
}

func (p *Postgres) Configure(conn interfaces.IConn) {
	p.Conn = conn
}

func (p *Postgres) Open() (interfaces.IConn, error) {
	value, err := p.Conn.Open()

	if err != nil {
		return nil, fmt.Errorf("couldn't connect to database: %w", err)
	}
	return value, nil
}
