package usercreate

import (
	"github.com/data_numbers/internal/models"
	"gorm.io/gorm"
)

type IRepository interface {
	CreateUser(input UserCreateInput) (*models.User, error)
}

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{
		db: db,
	}
}

func (repo *Repository) CreateUser(input UserCreateInput) (*models.User, error) {
	user := models.User{
		Name:     input.Name,
		Email:    input.Email,
		Password: input.Password,
	}

	if err := repo.db.Create(&user).Error; err != nil {
		return nil, err
	}

	return &user, nil
}
