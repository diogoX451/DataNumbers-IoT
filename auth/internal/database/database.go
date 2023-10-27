package database

import "gorm.io/gorm"

type Database struct {
	Host     string
	Port     string
	User     string
	Password string
	Dbname   string
	Schema   string
}

type IDatabase interface {
	Connect() *gorm.DB
}
