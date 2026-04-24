FROM golang:1.24.3-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o rule-engine ./cmd/api/main.go

FROM alpine:3.19
RUN adduser -D appuser
USER appuser
WORKDIR /app
COPY --from=builder /app/rule-engine .
ENTRYPOINT ["./rule-engine"]
