package models

import (
	"fmt"
	"time"

	"github.com/data_numbers/pkg/utils"
	"github.com/gofrs/uuid"
	"gorm.io/gorm"
)

type User struct {
	ID        uuid.UUID `gorm:"column:id;type:uuid;primary_key;default:gen_random_uuid()"`
	Name      string    `gorm:"column:name;unique;not null"`
	Email     string    `gorm:"column:email;unique;not null"`
	Password  string    `gorm:"column:password;not null" json:"-"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

func (entity *User) BeforeCreate(db *gorm.DB) error {
	entity.Password = utils.HashPassword(entity.Password)
	entity.CreatedAt = time.Now().UTC().Local()
	return nil
}

func (entity *User) BeforeUpdate(db *gorm.DB) error {
	entity.Password = utils.HashPassword(entity.Password)
	entity.UpdatedAt = time.Now().UTC().Local()
	return nil
}

func (u User) TableName() string {
	return fmt.Sprintf("auth.%s", "users")
}
