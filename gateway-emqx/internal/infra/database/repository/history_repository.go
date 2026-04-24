package repository

import (
	"github.com/diogoX451/gateway-broker/internal/domain/entities"
	"github.com/diogoX451/gateway-broker/internal/interfaces"
)

var _ interfaces.IHistoryRepository = (*HistoryRepository)(nil)

type HistoryRepository struct {
	Db interfaces.IConn
}

func (h *HistoryRepository) FindAll() ([]*entities.History, error) {
	return nil, nil
}

func (h *HistoryRepository) FindByID(id int64) (*entities.History, error) {
	return nil, nil
}

func (h *HistoryRepository) Create(history *entities.History) error {
	return h.Db.Exec(
		"INSERT INTO gateway.historys (observation, type, username, topic) VALUES ($1, $2, $3, $4)",
		history.Observation,
		history.Type,
		history.Username,
		history.Topic,
	)
}

func (h *HistoryRepository) Update(history *entities.History) error {
	return nil
}
