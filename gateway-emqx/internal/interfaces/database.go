package interfaces

type IDatabase interface {
	Configure(conn IConn)
	Open() (IConn, error)
}

type IConn interface {
	Open(dns ...string) (IConn, error)
	Close()
	Query(query string, args ...interface{}) (interface{}, error)
	Exec(query string, args ...interface{}) error
	Config(conf ...interface{})
}
