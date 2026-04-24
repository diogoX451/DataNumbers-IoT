package repository

import (
	"fmt"

	"github.com/diogoX451/gateway-broker/internal/config"
	"github.com/diogoX451/gateway-broker/internal/domain/entities"
	"github.com/diogoX451/gateway-broker/internal/interfaces"
)

var _ interfaces.IAclRepository = (*AclsRepository)(nil)

type AclsRepository struct {
	Db interfaces.IConn
}

func (a *AclsRepository) Create(acl *entities.Acl) error {
	topicName := string(config.GetYaml().Queue.Topics.GatewayData) + "/" + acl.Topic

	return a.Db.Exec(
		"INSERT INTO gateway.acls (username, topic, action, permission, tenant_id) VALUES ($1, $2, $3, $4, $5)",
		acl.Username,
		topicName,
		acl.Action,
		acl.Permission,
		acl.TenantID,
	)
}

func (a *AclsRepository) FindByUsername(username string) (*entities.Acl, error) {
	result, err := a.Db.Query("SELECT id, tenant_id::text, username, action, topic, permission FROM gateway.acls WHERE username = $1", username)
	if err != nil {
		return nil, err
	}

	results, ok := result.([]map[string]interface{})
	if !ok || len(results) == 0 {
		return nil, fmt.Errorf("acl not found for username: %s", username)
	}

	row := results[0]
	acl := &entities.Acl{
		ID:         fmt.Sprintf("%v", row["id"]),
		TenantID:   fmt.Sprintf("%v", row["tenant_id"]),
		Username:   fmt.Sprintf("%v", row["username"]),
		Action:     fmt.Sprintf("%v", row["action"]),
		Topic:      fmt.Sprintf("%v", row["topic"]),
		Permission: fmt.Sprintf("%v", row["permission"]),
	}

	return acl, nil
}
