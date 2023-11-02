FROM golang:1.21-alpine AS builder

WORKDIR /auth

# Crie o usuário não-root
RUN adduser -D aut

# Copie o go.mod e go.sum primeiro
COPY auth/go.mod auth/go.sum ./
RUN go mod download

# Depois copie o resto do código
COPY auth/ .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags '-w -extldflags "-static"' -o api api/main.go && \
    chmod +x api

FROM scratch

# Copie o arquivo /etc/passwd para permitir a execução como um usuário não-root
COPY --from=builder /etc/passwd /etc/passwd

# Mude para o usuário não-root
USER aut

# Copie o binário construído para a imagem scratch
COPY --from=builder /auth/api /auth/api

ENTRYPOINT ["/auth/api/main"]
