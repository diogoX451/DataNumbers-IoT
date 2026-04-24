FROM golang:1.24.3-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags "-w -s" -o gateway ./cmd/main.go

FROM alpine:3.19

WORKDIR /app
COPY --from=builder /app/gateway /app/gateway
COPY --from=builder /app/schema.json /app/schema.json
COPY --from=builder /app/internal/config/yaml /app/internal/config/yaml

EXPOSE 3002 5051
ENTRYPOINT ["/app/gateway"]
