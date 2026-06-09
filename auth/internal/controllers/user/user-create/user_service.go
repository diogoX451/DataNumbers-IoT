package usercreate

import (
	"github.com/data_numbers/internal/models"
)

type IUserCreateService interface {
	CreateUser(input UserCreateInput) (*models.User, error)
	GetUser(id string) (*models.User, error)
}

type UserCreateService struct {
	repo IRepository
}

func NewService(repo IRepository) *UserCreateService {
	return &UserCreateService{
		repo: repo,
	}
}

// CreateUser cria o usuário e seu tenant. A ACL MQTT é responsabilidade
// exclusiva do gateway-emqx (POST /api/gateway/create-acl) — não duplicamos
// aqui para evitar drift entre duas tabelas (auth.mqtt_acl vs gateway.acls).
func (service *UserCreateService) CreateUser(input UserCreateInput) (*models.User, error) {
	return service.repo.CreateUser(input)
}

func (service *UserCreateService) GetUser(id string) (*models.User, error) {
	return service.repo.GetUser(id)
}
