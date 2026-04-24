package repository

import (
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
		"INSERT INTO gateway.acls (username, topic, action, permission) VALUES ($1, $2, $3, $4)",
		acl.Username,
		topicName,
		acl.Action,
		acl.Permission,
	)
}
