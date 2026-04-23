include internal/config/env/.env
export $(shell sed 's/=.*//' internal/config/env/.env)

migrate-up:
	migrate -path internal/infra/database/migrations -database $$DNS_MIGRATE -verbose up

migrate-up-version:
	migrate -path internal/infra/database/migrations -database $$DNS_MIGRATE -verbose up $(version)

migrate-down:
	migrate -path internal/infra/database/migrations -database $$DNS_MIGRATE  -verbose down

migrate-force:
	migrate -path internal/infra/database/migrations -database $$DNS_MIGRATE  -verbose force $(version)

migrate-create:
	migrate create -ext sql -dir internal/infra/database/migrations -seq $(name)
