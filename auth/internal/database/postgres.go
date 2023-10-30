package database

import (
	"os"

	"github.com/data_numbers/internal/database/migrate"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type Postgres struct{}

func NewDatabasePostegres() *Postgres {
	return &Postgres{}
}

func (d *Postgres) Connect() *gorm.DB {
	dsn := os.Getenv("DB_DNS")
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})

	if err != nil {
		panic("failed to connect database")
	}

	db.AutoMigrate(&migrate.Users{}, &migrate.Sessions{})

	return db
}
