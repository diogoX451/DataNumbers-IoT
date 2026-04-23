CREATE TYPE gateway.historys_type AS ENUM ('error', 'warning', 'info');
CREATE TABLE IF NOT EXISTS gateway.historys (
    id SERIAL PRIMARY KEY,
    observation varchar(255) NOT NULL,
    type gateway.historys_type NOT NULL,
    username varchar(255) NOT NULL,
    topic varchar(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);