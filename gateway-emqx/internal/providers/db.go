package providers

import (
	"github.com/gateway-emqx/gateway-emqx/internal/database"
	"github.com/gateway-emqx/gateway-emqx/internal/database/migrations"
	"github.com/gateway-emqx/gateway-emqx/internal/database/migrations/querys"
)

type DatabaseProviders struct {
}

func NewDatabaseProviders() *DatabaseProviders {
	return &DatabaseProviders{}
}

func (d *DatabaseProviders) Connect() database.Database {
	db := database.InitializeDatabaseFactory()
	db.SetCloseAutomaticConn(0)
	db.SetConnection(10)
	db.SetMinConnections(5)

	connect := db.Connect()

	if connect != nil {
		return db
	}

	mg := migrations.NewMigrations(db)
	mg.Run([]migrations.IMigration{
		querys.NewInit(),
		querys.NewHistorys(),
	})

	return db

}
