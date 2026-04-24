package adapter

import (
	"context"
	"fmt"
	"time"

	"github.com/diogoX451/gateway-broker/internal/config"
	"github.com/diogoX451/gateway-broker/internal/interfaces"
	"github.com/jackc/pgx/v5/pgxpool"
)

var _ interfaces.IConn = (*PgxPoolAdapter)(nil)

type PgxPoolAdapter struct {
	db     *pgxpool.Pool
	config *pgxpool.Config
}

func (pgx *PgxPoolAdapter) Open(dns ...string) (interfaces.IConn, error) {
	var value string
	if len(dns) == 0 {
		value = config.Get("DNS_DATABASE")
	}

	pool, err := pgxpool.New(context.Background(), value)
	if err != nil {
		return nil, fmt.Errorf("couldn't connect to database: %w", err)
	}

	pgx.db = pool

	return pgx, nil
}

func (pgx *PgxPoolAdapter) Config(conf ...interface{}) {
	if len(conf) == 0 {
		return
	}

	if conf, ok := conf[0].(pgxpool.Config); ok {
		pgx.configurePool(conf)
	}
}

func (pgx *PgxPoolAdapter) configurePool(config pgxpool.Config) {
	pgx.config = &config
}

func (pgx *PgxPoolAdapter) Query(query string, params ...interface{}) (interface{}, error) {
	ctx := context.Background()

	rows, err := pgx.db.Query(ctx, query, params...)
	if err != nil {
		return nil, err
	}

	var results []map[string]interface{}

	fields := rows.FieldDescriptions()
	columnNames := make([]string, len(fields))
	for i, fd := range fields {
		columnNames[i] = string(fd.Name)
	}

	for rows.Next() {
		values, err := rows.Values()
		if err != nil {
			return nil, err
		}

		rowMap := make(map[string]interface{})
		for i, colName := range columnNames {
			rowMap[colName] = values[i]
		}
		results = append(results, rowMap)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return results, nil
}

func (pgx *PgxPoolAdapter) Exec(query string, params ...interface{}) error {

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := pgx.db.Exec(ctx, query, params...)
	if err != nil {
		return fmt.Errorf("failed to execute query: %s, error: %w", query, err)
	}

	return nil
}

func (pgx *PgxPoolAdapter) Close() {
	if pgx.db != nil {
		pgx.db.Close()
	}
}
