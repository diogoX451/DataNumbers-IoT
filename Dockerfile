# Etapa de construção com a imagem base do Golang
FROM golang:1.24.3-alpine AS builder

# Instalar OpenSSL
RUN apk --no-cache add openssl

# Definir o diretório de trabalho no container
WORKDIR /auth

# Copiar os arquivos go.mod e go.sum para o container
COPY auth/go.mod auth/go.sum ./

# Baixar as dependências do projeto
RUN go mod download

# Copiar o restante do código fonte para o container
COPY auth/ .

# Compilar o código fonte
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags '-w -extldflags "-static"' -o auth-api api/main.go && \
    chmod +x auth-api

# Etapa final para criar uma imagem pequena
FROM alpine:3.19

RUN apk --no-cache add openssl && \
    adduser -D aut

WORKDIR /auth

# Copiar o executável compilado
COPY --from=builder /auth/auth-api /auth/auth-api

# Garantir diretório de certs e gerar chaves iniciais
RUN mkdir -p /auth/certs && \
    openssl genpkey -algorithm RSA -out /auth/certs/private_key.pem && \
    openssl rsa -pubout -in /auth/certs/private_key.pem -out /auth/certs/public_key.pem && \
    chmod 644 /auth/certs/private_key.pem /auth/certs/public_key.pem && \
    chown -R aut:aut /auth/ && \
    chown -R aut:aut /auth/certs

# Mudar para o usuário não-root
USER aut

# Definir o ponto de entrada para o executável
ENTRYPOINT ["/auth/auth-api"]
