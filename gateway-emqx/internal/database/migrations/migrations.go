package migrations

import (
	"fmt"

	"github.com/gateway-emqx/gateway-emqx/internal/database"
)

type Database = database.Database

type IMigration interface {
	Up(Database) error
	Down(Database) error
	GetTableName() string
}

type Migrations struct {
	db Database
}

func NewMigrations(db Database) *Migrations {
	return &Migrations{db: db}
}

func (m *Migrations) Run(migrations []IMigration) error {

	for _, migration := range migrations {
		vf, err := m.db.TableExists(migration.GetTableName())
		if err != nil {
			return err
		}

		if !vf {
			if err := migration.Up(m.db); err != nil {
				return err
			}

			fmt.Println("Migration", migration.GetTableName(), "executed")
			m.db.Query("INSERT INTO migrations (table_name) VALUES ($1)", migration.GetTableName())
		}
	}

	return nil
}

func (m *Migrations) Rollback(migrations []IMigration) error {
	for _, migration := range migrations {
		if err := migration.Down(m.db); err != nil {
			return err
		}
	}

	return nil
}

func (m *Migrations) Close() {
	m.db.Close()
}
