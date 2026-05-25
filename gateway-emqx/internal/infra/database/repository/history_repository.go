package repository

import (
	"fmt"
	"time"

	"github.com/diogoX451/gateway-broker/internal/domain/entities"
	"github.com/diogoX451/gateway-broker/internal/interfaces"
)

var _ interfaces.IHistoryRepository = (*HistoryRepository)(nil)

type HistoryRepository struct {
	Db interfaces.IConn
}

func (h *HistoryRepository) FindAll() ([]*entities.History, error) {
	rows, err := h.Db.Query(`
		SELECT id, observation, type::text, username, topic, created_at, updated_at
		FROM gateway.historys
		ORDER BY created_at DESC
		LIMIT 200
	`)
	if err != nil {
		return nil, err
	}
	results, ok := rows.([]map[string]interface{})
	if !ok {
		return []*entities.History{}, nil
	}
	out := make([]*entities.History, 0, len(results))
	for _, row := range results {
		out = append(out, hydrateHistory(row))
	}
	return out, nil
}

func (h *HistoryRepository) FindByID(id int64) (*entities.History, error) {
	rows, err := h.Db.Query(`
		SELECT id, observation, type::text, username, topic, created_at, updated_at
		FROM gateway.historys WHERE id = $1
	`, id)
	if err != nil {
		return nil, err
	}
	results, ok := rows.([]map[string]interface{})
	if !ok || len(results) == 0 {
		return nil, fmt.Errorf("history not found: %d", id)
	}
	return hydrateHistory(results[0]), nil
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
	return h.Db.Exec(
		"UPDATE gateway.historys SET observation = $1, type = $2, username = $3, topic = $4, updated_at = now() WHERE id = $5",
		history.Observation,
		history.Type,
		history.Username,
		history.Topic,
		history.ID,
	)
}

func hydrateHistory(row map[string]interface{}) *entities.History {
	return &entities.History{
		ID:          toInt64(row["id"]),
		Observation: stringValue(row["observation"]),
		Type:        stringValue(row["type"]),
		Username:    stringValue(row["username"]),
		Topic:       stringValue(row["topic"]),
		CreatedAt:   timeValue(row["created_at"]),
		UpdatedAt:   timeValue(row["updated_at"]),
	}
}

func toInt64(v interface{}) int64 {
	switch t := v.(type) {
	case int64:
		return t
	case int32:
		return int64(t)
	case int:
		return int64(t)
	case float64:
		return int64(t)
	}
	return 0
}

func stringValue(v interface{}) string {
	if v == nil {
		return ""
	}
	if s, ok := v.(string); ok {
		return s
	}
	return fmt.Sprintf("%v", v)
}

func timeValue(v interface{}) string {
	if v == nil {
		return ""
	}
	if t, ok := v.(time.Time); ok {
		return t.UTC().Format(time.RFC3339)
	}
	return fmt.Sprintf("%v", v)
}
