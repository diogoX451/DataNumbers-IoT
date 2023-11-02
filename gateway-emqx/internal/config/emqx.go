package config

import (
	"os"
)

type Emqx struct {
	Host     string
	Port     string
	Username string
	Password string
}

func NewEmqx() *Emqx {
	return &Emqx{
		Host:     os.Getenv("EMQX_HOST"),
		Port:     os.Getenv("EMQX_PORT"),
		Username: os.Getenv("EMQX_USERNAME"),
		Password: os.Getenv("EMQX_PASSWORD"),
	}
}

func (e *Emqx) Connect() {

}
