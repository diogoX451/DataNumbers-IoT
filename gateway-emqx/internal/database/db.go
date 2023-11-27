package database

import (
	"time"
)

type Database interface {
	Connect() error
	SetConnection(n int32)
	SetMinConnections(n int32)
	SetCloseAutomaticConn(timeout time.Duration)
	Insert(query string, params ...interface{}) (interface{}, error)
	Query(query string, params ...interface{}) (interface{}, error)
	Close()
}
