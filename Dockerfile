FROM golang:1.22-alpine AS builder

WORKDIR /auth
RUN adduser -D aut

COPY auth/go.mod auth/go.sum ./
RUN go mod download

COPY auth/ .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags '-w -extldflags "-static"' -o api api/main.go && \
    chmod +x api

FROM scratch

COPY --from=builder /etc/passwd /etc/passwd
USER aut
COPY --from=builder /auth/api /auth/api

ENTRYPOINT ["/auth/api/main"]
