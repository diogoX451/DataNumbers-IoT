package config

import "github.com/redis/go-redis/v9"

type Redis struct {
	Host     string
	Port     string
	Password string
	Db       int
}

func NewRedis(host string, port string, password string, db int) *Redis {
	return &Redis{
		Host:     host,
		Port:     port,
		Password: password,
		Db:       db,
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
