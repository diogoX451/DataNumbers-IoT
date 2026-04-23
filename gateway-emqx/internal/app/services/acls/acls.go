package acls_service

import (
	"github.com/nextsync/gateway-broker/internal/domain/dto"
	"github.com/nextsync/gateway-broker/internal/domain/entities"
	"github.com/nextsync/gateway-broker/internal/interfaces"
)

type AclService struct {
	Repo interfaces.IAclRepository
}

func (a *AclService) CreateAcl(data dto.CreateAcl) error {
	return a.Repo.Create(&entities.Acl{
		Username:   data.Username,
		Topic:      data.Topic,
		Action:     data.Action,
		Permission: data.Permission,
	})
}
