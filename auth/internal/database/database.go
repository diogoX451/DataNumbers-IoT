package database

import "gorm.io/gorm"

type IDatabase interface {
	Connect() *gorm.DB
}
