FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o calendar-tool ./api/main.go

FROM alpine:3.19
RUN adduser -D appuser
USER appuser
WORKDIR /app
COPY --from=builder /app/calendar-tool .
ENTRYPOINT ["./calendar-tool"]
