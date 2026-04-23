package models

import (
	"fmt"
	"time"

	"github.com/gofrs/uuid"
	"gorm.io/gorm"
)

type MqttAcl struct {
	ID         uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Name       string    `gorm:"type:string;not null;"`
	Ipaddr     string    `gorm:"type:string;not null"`
	User_id    uuid.UUID `gorm:"type:uuid;not null"`
	Clientid   string    `gorm:"type:string;not null"`
	Permission string    `gorm:"type:string;not null"`
	Action     string    `gorm:"type:string;not null"`
	Topic      string    `gorm:"type:string;not null"`
	Qos        int       `gorm:"type:int;not null"`
	Retain     bool      `gorm:"type:boolean;not null"`
	Users      User      `gorm:"foreignKey:user_id"`
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

func (m MqttAcl) TableName() string {
	return fmt.Sprintf("auth.%s", "mqtt_acl")
}

func (m *MqttAcl) BeforeCreate(db *gorm.DB) (err error) {
	id := uuid.Must(uuid.NewV4())
	m.Topic = fmt.Sprintf("topic/%s", id.String())
	m.Retain = false
	m.Qos = 1
	m.Permission = "allow"
	m.Action = "publish"
	m.CreatedAt = time.Now().UTC().Local()
	return
}

func (m *MqttAcl) BeforeUpdate(db *gorm.DB) (err error) {
	m.UpdatedAt = time.Now().UTC().Local()
	return
}
