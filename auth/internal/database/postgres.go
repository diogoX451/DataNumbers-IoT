package database

import (
	"github.com/data_numbers/internal/database/migrate"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func (d *Database) Connect() *gorm.DB {
	dsn := "host=" + d.Host + " user=" + d.User + " password=" + d.Password + " dbname=" + d.Dbname + " port=" + d.Port + " sslmode=disable TimeZone=America/Brazil"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})

	if err != nil {
		panic("failed to connect database")
	}

	db.AutoMigrate(&migrate.Users{})

	return db
}
