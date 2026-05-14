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
