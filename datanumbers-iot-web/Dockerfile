# --- build ---
FROM node:22-alpine AS builder
WORKDIR /app

# Cache layer de deps
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm install --no-audit --no-fund

# Build
COPY . .
RUN npm run build

# --- runtime ---
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
# `localhost` resolve para ::1 dentro do container e o nginx só escuta IPv4
# por padrão — força 127.0.0.1 pra healthcheck funcionar.
HEALTHCHECK --interval=15s --timeout=3s \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1
