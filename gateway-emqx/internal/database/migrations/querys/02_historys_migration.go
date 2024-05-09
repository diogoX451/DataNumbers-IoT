package querys

import (
	"log"

	"github.com/gateway-emqx/gateway-emqx/internal/database"
	"github.com/gateway-emqx/gateway-emqx/internal/database/migrations"
)

var _ migrations.IMigration = (*Historys)(nil)

const (
	tableName = "historys"
)

type Historys struct {
}

func NewHistorys() *Historys {
	return &Historys{}
}

func (h *Historys) GetTableName() string {
	return tableName
}

func (h *Historys) Up(db database.Database) error {
	query := `
		CREATE TABLE IF NOT EXISTS historys (
    		id varchar(150) PRIMARY KEY,
    		observation varchar(255),
    		type varchar(255),
    		username varchar(255),
    		topic varchar(50),
    		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);
	`
	_, err := db.Query(query)

	if err != nil {
		log.Printf("Error creating table historys: %v", err)
		return err
	}

	return nil
}

func (h *Historys) Down(db database.Database) error {
	query := `DROP TABLE IF EXISTS historys;`

	_, err := db.Query(query)

	if err != nil {
		log.Printf("Error dropping table historys: %v", err)
		return err
	}

	return nil
}
