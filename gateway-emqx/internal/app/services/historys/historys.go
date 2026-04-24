package historys_service

import (
	"github.com/diogoX451/gateway-broker/internal/domain/entities"
	"github.com/diogoX451/gateway-broker/internal/interfaces"
)

type HistoryService struct {
	Repo interfaces.IHistoryRepository
}

func (h *HistoryService) Create(history entities.History) error {
	return h.Repo.Create(&history)
}
