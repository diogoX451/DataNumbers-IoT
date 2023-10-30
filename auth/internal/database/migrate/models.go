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
	Email    string    `gorm:"type:string;not null;unique"`
	Password string    `gorm:"type:string;not null"`
}

func (u Users) TableName() string {
	return WithSchema("auth", "users")
}

type Sessions struct {
	gorm.Model
	ID        uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	UserID    uuid.UUID `gorm:"type:uuid;not null"`
	ExpiredAt int64     `gorm:"type:bigint;not null"`
}

func (s Sessions) TableName() string {
	return WithSchema("auth", "sessions")
}
