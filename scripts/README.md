# scripts

Utilitários de bancada usados em desenvolvimento. **Não fazem parte do go.work**
e não são empacotados pelos Dockerfiles dos serviços.

- `test_nats.go` — publica uma mensagem de telemetria de exemplo no subject
  `iot.telemetry.received` para validar o pipeline (gateway → data-management
  → rule-engine).
- `test_ws.go` — cliente WebSocket simples que conecta em `/api/stream` e
  imprime mensagens recebidas.

## Como rodar

```bash
cd scripts
go run test_nats.go
go run test_ws.go
```

Cada arquivo é `package main` independente. Use a tag de build apenas se
quiser evitar conflito de símbolos:

```bash
go run -tags scripts test_nats.go
```
