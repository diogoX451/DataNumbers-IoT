package checkusername

import (
	"github.com/data_numbers/internal/models"
	"gorm.io/gorm"
)

type ICheckUsername interface {
	CheckUsername(input *CheckUsernameInput) bool
}

type CheckUsernameRepository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *CheckUsernameRepository {
	return &CheckUsernameRepository{
		db: db,
	}
}

func (repo *CheckUsernameRepository) CheckUsername(input *CheckUsernameInput) bool {
	var user models.User
	if err := repo.db.Where("username = ?", input.Username).First(&user).Error; err != nil {
		return false
	}

	return true
}
