package migrate

import (
	"github.com/gofrs/uuid"
	"gorm.io/gorm"
)

type Users struct {
	gorm.Model
	ID       uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Name     string    `gorm:"type:string;not null"`
	Email    string    `gorm:"type:string;not null;unique"`
	Password string    `gorm:"type:string;not null"`
}
