package interfaces

import (
	"github.com/diogoX451/gateway-broker/internal/domain/dto"
	"github.com/diogoX451/gateway-broker/internal/domain/entities"
)

type IAclsService interface {
	CreateAcl(dto.CreateAcl) error
}

type IHistoryService interface {
	Create(entities.History) error
}
