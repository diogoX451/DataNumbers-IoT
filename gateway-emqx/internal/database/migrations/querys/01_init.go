package querys

import (
	"github.com/gateway-emqx/gateway-emqx/internal/database"
	"github.com/gateway-emqx/gateway-emqx/internal/database/migrations"
)

var _ migrations.IMigration = (*Init)(nil)

const (
	INIT = "migrations"
)

type Init struct {
}

func NewInit() *Init {
	return &Init{}
}

func (i *Init) GetTableName() string {
	return INIT
}

func (i *Init) Up(db database.Database) error {

	query := `
		CREATE TABLE IF NOT EXISTS migrations (
			id serial PRIMARY KEY,
			table_name varchar(255),
			create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);
	`

	_, err := db.Query(query)

	if err != nil {
		return err
	}

	return nil
}

func (i *Init) Down(db database.Database) error {
	query := `DROP TABLE IF EXISTS migrations;`

	_, err := db.Query(query)

	if err != nil {
		return err
	}

	return nil
}
