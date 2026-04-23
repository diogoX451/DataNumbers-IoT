package interfaces

import "github.com/nextsync/gateway-broker/internal/domain/entities"

type IHistoryRepository interface {
	FindAll() ([]*entities.History, error)
	FindByID(id int64) (*entities.History, error)
	Create(history *entities.History) error
	Update(history *entities.History) error
}

type IAclRepository interface {
	Create(acl *entities.Acl) error
}
