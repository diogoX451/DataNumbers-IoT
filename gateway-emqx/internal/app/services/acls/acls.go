package acls_service

import (
	"fmt"

	"github.com/diogoX451/gateway-broker/internal/domain/dto"
	"github.com/diogoX451/gateway-broker/internal/domain/entities"
	"github.com/diogoX451/gateway-broker/internal/interfaces"
)

type AclService struct {
	Repo interfaces.IAclRepository
}

func (a *AclService) CreateAcl(data dto.CreateAcl) error {
	if data.TenantID == "" {
		return fmt.Errorf("tenant_id is required")
	}
	if data.Username == "" || data.Topic == "" {
		return fmt.Errorf("username and topic are required")
	}
	return a.Repo.Create(&entities.Acl{
		TenantID:   data.TenantID,
		Username:   data.Username,
		Topic:      data.Topic,
		Action:     data.Action,
		Permission: data.Permission,
	})
}
