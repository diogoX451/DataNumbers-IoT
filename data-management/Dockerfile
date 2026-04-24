FROM golang:1.24.3-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags "-w -s" -o data-management ./cmd/worker

FROM alpine:3.19

RUN adduser -D app
USER app
WORKDIR /app

COPY --from=builder /app/data-management /app/data-management

EXPOSE 3003
ENTRYPOINT ["/app/data-management"]
