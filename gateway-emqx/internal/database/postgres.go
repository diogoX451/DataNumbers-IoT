package database

import (
	"context"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Postgres struct {
	db     *pgxpool.Pool
	config *pgxpool.Config
}

var _ Database = &Postgres{}

func NewPostgres() *Postgres {
	return &Postgres{
		config: &pgxpool.Config{},
	}
}

func (p *Postgres) Connect() error {
	pool, err := pgxpool.New(context.Background(), os.Getenv("DB_DNS"))

	if err != nil {
		panic("Couldn't connect to database")
	}
	p.db = pool
	return nil
}

func (p *Postgres) SetConnection(n int32) {
	p.config.MaxConns = n
}

func (p *Postgres) SetMinConnections(n int32) {
	p.config.MinConns = n
}

func (p *Postgres) SetCloseAutomaticConn(timeout time.Duration) {
	p.config.MaxConnIdleTime = timeout
}

func (p *Postgres) Close() {
	if p.db != nil {
		p.db.Close()
	}
}

func (p *Postgres) Query(query string, params ...interface{}) (interface{}, error) {
	ctx := context.Background()

	rows, err := p.db.Query(ctx, query, params...)
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

func (p *Postgres) Insert(query string, params ...interface{}) (interface{}, error) {
	var results []map[string]interface{}
	err := p.db.QueryRow(context.Background(), query, params...).Scan(&results)

	if err != nil {
		return "", err
	}

	return results, nil
}
