package models

import (
	"fmt"
	"time"

	"github.com/gofrs/uuid"
	"gorm.io/gorm"
)

type Tenant struct {
	ID        uuid.UUID `gorm:"column:id;type:uuid;primary_key;default:gen_random_uuid()"`
	Name      string    `gorm:"column:name;unique;not null"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

func (entity *Tenant) BeforeCreate(db *gorm.DB) error {
	entity.CreatedAt = time.Now().UTC()
	return nil
}

func (entity *Tenant) BeforeUpdate(db *gorm.DB) error {
	entity.UpdatedAt = time.Now().UTC()
	return nil
}

func (t Tenant) TableName() string {
	return fmt.Sprintf("auth.%s", "tenants")
}
