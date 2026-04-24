# Projeto Data Numbers IoT

## Descrição
Este repositório contém o código-fonte e a documentação para a construção de uma plataforma IoT onde o processamento e acesso de dados ocorrem de forma centralizada. A plataforma utiliza EMQX como gateway MQTT, NATS como barramento de mensageria entre microsserviços e um PostgreSQL/TimescaleDB único separado por schemas.

## Funcionalidades Principais
- Integração de gateways MQTT utilizando EMQX para a comunicação eficiente entre dispositivos IoT e a plataforma.
- Utilização do NATS como barramento de mensageria para gerenciar e distribuir eventos de forma escalável.
- Arquitetura de microserviços para processamento modular e distribuído de dados.

## Tecnologias Utilizadas
- [EMQX](https://www.emqx.io/): Gateway MQTT para comunicação eficiente entre dispositivos.
- [NATS](https://nats.io/): Broker de mensageria para contratos assíncronos entre microsserviços.
- [Golang](https://go.dev/): versão alvo `go1.24.3 linux/amd64`.
- [PostgreSQL/TimescaleDB](https://www.timescale.com/): Banco único da plataforma, separado por schemas.

## Arquitetura Local

A arquitetura alvo usa microsserviços em Go, NATS como barramento canônico e um único PostgreSQL/TimescaleDB com schemas separados por domínio de serviço.

Schemas criados no banco único:

- `auth`
- `gateway`
- `device_manager`
- `data_management`

Serviços configurados no `docker-compose.yaml`:

- `postgres`: banco único com TimescaleDB habilitado.
- `redis`: apoio ao `auth-api`.
- `nats`: broker com JetStream habilitado.
- `emqx`: broker MQTT de entrada dos dispositivos.
- `auth-api`: serviço Go de autenticação.
- `device-manager`: serviço Go de templates e dispositivos.
- `gateway-emqx`: serviço Go que conecta EMQX ao NATS.
- `data-management`: serviço Go que consome telemetria NATS e persiste no TimescaleDB.

Contratos NATS versionáveis ficam em `contracts/nats/`.

Os diretórios Java foram removidos. A arquitetura ativa do repositório usa microserviços Go em diretórios de primeiro nível.

Fluxo de telemetria ativo:

```text
MQTT gateway.data/<device_uuid>
  -> gateway-emqx
  -> NATS iot.telemetry.received
  -> data-management
  -> data_management.devices_data
```

O dispositivo publica apenas o `payload` dinâmico. O `gateway-emqx` adiciona o envelope com `event_id`, `device_id`, `template_id`, `schema_version`, `topic`, `timestamp` e `metadata`.

## Serviços Go

```text
auth/              # autenticação e ACL inicial
gateway-emqx/      # gateway EMQX -> NATS
device-manager/    # templates, fields e devices
data-management/   # consumidor de telemetria e persistência
```

Portas padrão:

- `auth-api`: `3000`
- `device-manager`: `3001`
- `gateway-emqx` HTTP: `3002`
- `data-management`: `3003`
- `gateway-emqx` gRPC exhook: `5051`

Para configurar portas e credenciais locais:

```bash
cp .env.example .env
```

Para validar a configuração do compose:

```bash
docker compose config
```

Para subir a infraestrutura:

```bash
docker compose up --build
```

## Status do Projeto
Este projeto está em desenvolvimento ativo. Novas funcionalidades, melhorias e correções estão sendo implementadas regularmente. Fique atento para atualizações futuras.

## Contato para contribuição
Para sugestões, dúvidas ou problemas relacionados ao projeto, entre em contato através do email diogosgn@gmail.com e huakson@gmail.com.

---
**Nota:** Este projeto está em constante evolução. Fique à vontade para contribuir, reportar problemas ou sugerir melhorias. Obrigado por fazer parte do desenvolvimento desta plataforma IoT!
