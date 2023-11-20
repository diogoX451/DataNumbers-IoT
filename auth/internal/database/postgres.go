package database

import (
	"fmt"
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

	fmt.Println("DB_DNS", dsn)
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})

	if err != nil {
		panic("failed to connect database")
	}

	db.AutoMigrate(&migrate.Users{}, &migrate.MqttAcl{})

	return db
}
