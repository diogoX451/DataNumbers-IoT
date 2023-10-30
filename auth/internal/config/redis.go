package config

import (
	"os"

	"github.com/redis/go-redis/v9"
)

type Redis struct {
	Host     string
	Port     string
	Password string
	Db       int
}

func NewRedis() *Redis {
	return &Redis{
		Host:     os.Getenv("HOST_REDIS"),
		Port:     os.Getenv("PORT_REDIS"),
		Password: os.Getenv("PASSWORD_REDIS"),
		Db:       0,
	}
}

func (r *Redis) Client() *redis.Client {
	client := redis.NewClient(&redis.Options{
		Addr:     r.Host + ":" + r.Port,
		Password: r.Password,
		DB:       r.Db,
	})

	return client
}
