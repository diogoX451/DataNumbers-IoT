package migrate

import (
	"fmt"

	"github.com/gofrs/uuid"
	"gorm.io/gorm"
)

func WithSchema(schema string, tableName string) string {
	return fmt.Sprintf("%s.%s", schema, tableName)
}

type Users struct {
	gorm.Model
	ID       uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Name     string    `gorm:"type:string;not null"`
	Username string    `gorm:"index:username;type:string;not null;unique"`
	Email    string    `gorm:"type:string;not null;unique"`
	Password string    `gorm:"type:string;not null"`
}

func (u Users) TableName() string {
	return WithSchema("auth", "users")
}

type actionType string

const (
	PUBLISH   actionType = "publish"
	SUBSCRIBE actionType = "subscribe"
	ALL       actionType = "all"
)

type permissionType string

const (
	ALLOW permissionType = "allow"
	DENY  permissionType = "deny"
)

type MqttAcl struct {
	gorm.Model
	ID         uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Ipaddr     string         `gorm:"type:string;not null"`
	User_id    uuid.UUID      `gorm:"type:uuid;not null"`
	Clientid   string         `gorm:"type:string;not null"`
	Permission permissionType `gorm:"type:string;not null"`
	Action     actionType     `gorm:"type:string;not null"`
	Topic      string         `gorm:"type:string;not null"`
	Qos        int            `gorm:"type:int;not null"`
	Retain     bool           `gorm:"type:boolean;not null"`
	Users      Users          `gorm:"foreignKey:user_id"`
}

func (m MqttAcl) TableName() string {
	return WithSchema("auth", "mqtt_acl")
}
