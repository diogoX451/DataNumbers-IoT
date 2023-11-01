package userfind

import (
	"github.com/data_numbers/internal/models"
	"gorm.io/gorm"
)

type IUserFindRepository interface {
	GetUser(id string) (*models.User, error)
}

type UserFindRepository struct {
	db *gorm.DB
}

func NewUserFindRepository(db *gorm.DB) *UserFindRepository {
	return &UserFindRepository{
		db: db,
	}
}

func (repo *UserFindRepository) GetUser(id string) (*models.User, error) {
	var user models.User

	if err := repo.db.Where("id = ?", id).First(&user).Error; err != nil {
		return nil, err
	}

	return &user, nil
}
