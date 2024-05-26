FROM golang:1.22-alpine AS builder

# Instalar OpenSSL
RUN apk --no-cache add openssl

# Definir o diretório de trabalho no container
WORKDIR /auth

# Adicionar um usuário não-root
RUN adduser -D aut

# Copiar os arquivos go.mod e go.sum para o container
COPY auth/go.mod auth/go.sum ./

# Baixar as dependências do projeto
RUN go mod download

# Copiar o restante do código fonte para o container
COPY auth/ .

# Compilar o código fonte
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags '-w -extldflags "-static"' -o api api/main.go && \
    chmod +x api

RUN openssl genpkey -algorithm RSA -out /auth/private_key.pem && \
    openssl rsa -pubout -in /auth/private_key.pem -out /auth/public_key.pem && \
    chmod 644 /auth/private_key.pem /auth/public_key.pem

# Etapa final para criar uma imagem pequena
FROM scratch

# Copiar o arquivo /etc/passwd para o novo container
COPY --from=builder /etc/passwd /etc/passwd

# Mudar para o usuário não-root
USER aut

# Copiar o executável compilado e as chaves
COPY --from=builder /auth/api /auth/api
COPY --from=builder /auth/private_key.pem /auth/api/private_key.pem
COPY --from=builder /auth/public_key.pem /auth/api/public_key.pem

# Definir o ponto de entrada para o executável
ENTRYPOINT ["/auth/api/main"]
