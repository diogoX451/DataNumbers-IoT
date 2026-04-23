package interfaces

import (
	"github.com/nextsync/gateway-broker/internal/domain/dto"
	"github.com/nextsync/gateway-broker/internal/domain/entities"
)

type IAclsService interface {
	CreateAcl(dto.CreateAcl) error
}

type IHistoryService interface {
	Create(entities.History) error
}
