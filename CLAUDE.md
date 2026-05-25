# Session Bootstrap - DataNumbers-IoT

Este projeto compartilha uma base de conhecimento opcional, configurável via
variável de ambiente `BASE_CONHECIMENTO_DIR`. Quando definida, aplique o
conteúdo abaixo; caso contrário, este bootstrap é apenas informativo.

Sugestão de leitura inicial (se a variável estiver configurada):

- `$BASE_CONHECIMENTO_DIR/README.md`
- `$BASE_CONHECIMENTO_DIR/schema/assistant-bootstrap-global.md`

Regra de continuidade:

- identificar o domínio/páginas relevantes antes de codar;
- registrar implementações relevantes na wiki e no log do domínio;
- se wiki e código divergirem, prevalece o código e a wiki deve ser atualizada.

Ao concluir uma implementação:

- atualizar as páginas impactadas em `$BASE_CONHECIMENTO_DIR/wiki/domains/`;
- atualizar índice/log do domínio relacionado.

## Convenções deste repositório

- Banco único TimescaleDB com schemas por domínio (`auth`, `gateway`,
  `device_manager`, `data_management`, `automation`).
- Migrations canônicas vivem em `infra/postgres/init/001-schemas.sql`. Não
  duplicar DDL em pastas de migrations por serviço.
- NATS é o barramento canônico. Telemetria flui por
  `iot.telemetry.received` (stream `IOT_TELEMETRY`, JetStream).
- ACL MQTT é gerenciada exclusivamente pelo `gateway-emqx`
  (`POST /api/gateway/create-acl`); não duplicar em `auth`.
