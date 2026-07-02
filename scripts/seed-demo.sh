#!/usr/bin/env bash
# Seed pra apresentação: cria tenant/user/device/actuator/regras de demo
# via API real (nada de mock). Idempotente — pode rodar de novo sem duplicar.
#
# Uso:
#   POSTGRES_PORT=5434 docker compose up -d
#   ./scripts/seed-demo.sh
set -euo pipefail

GATEWAY="${GATEWAY_URL:-http://localhost:8080}"
EMAIL="${DEMO_EMAIL:-demo@datanumbers.io}"
PASSWORD="${DEMO_PASSWORD:-Senha123!}"
NAME="${DEMO_NAME:-Demo}"
USERNAME="${DEMO_USERNAME:-demo}"
COMPANY="${DEMO_COMPANY:-Demo Tenant}"

json_get() { python3 -c "import sys,json;d=json.load(sys.stdin);print(d$1)" 2>/dev/null || true; }

echo "==> Login (ou registro se ainda não existe)"
LOGIN_RESP=$(curl -s -X POST "$GATEWAY/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
TOKEN=$(echo "$LOGIN_RESP" | json_get "['data']['token']")

if [ -z "$TOKEN" ]; then
  echo "    usuário não existe, registrando..."
  curl -s -X POST "$GATEWAY/api/auth/register-user" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$NAME\",\"email\":\"$EMAIL\",\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\",\"company_name\":\"$COMPANY\"}" > /dev/null
  LOGIN_RESP=$(curl -s -X POST "$GATEWAY/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
  TOKEN=$(echo "$LOGIN_RESP" | json_get "['data']['token']")
fi

if [ -z "$TOKEN" ]; then
  echo "ERRO: não consegui logar nem registrar. Resposta: $LOGIN_RESP" >&2
  exit 1
fi
AUTH="Authorization: Bearer $TOKEN"
echo "    ok — token obtido"

echo "==> Template de device"
TEMPLATES=$(curl -s "$GATEWAY/api/devices/templates" -H "$AUTH")
TEMPLATE_ID=$(echo "$TEMPLATES" | python3 -c "
import sys,json
d=json.load(sys.stdin)
items = d if isinstance(d, list) else d.get('data', [])
for t in items:
    if t.get('name') == 'Bomba Dagua':
        print(t['template_id']); break
" 2>/dev/null || true)
if [ -z "$TEMPLATE_ID" ]; then
  TEMPLATE_ID=$(curl -s -X POST "$GATEWAY/api/devices/templates" -H "$AUTH" -H "Content-Type: application/json" \
    -d '{"name":"Bomba Dagua","description":"demo","fields":[]}' | json_get "['template_id']")
  echo "    criado: $TEMPLATE_ID"
else
  echo "    já existia: $TEMPLATE_ID"
fi

echo "==> Device"
DEVICES=$(curl -s "$GATEWAY/api/devices/devices" -H "$AUTH")
DEVICE_ID=$(echo "$DEVICES" | python3 -c "
import sys,json
d=json.load(sys.stdin)
items = d if isinstance(d, list) else d.get('data', [])
for dev in items:
    if dev.get('device_name') == 'Bomba Jardim':
        print(dev['device_id']); break
" 2>/dev/null || true)
if [ -z "$DEVICE_ID" ]; then
  DEVICE_ID=$(curl -s -X POST "$GATEWAY/api/devices/devices" -H "$AUTH" -H "Content-Type: application/json" \
    -d "{\"device_name\":\"Bomba Jardim\",\"template_id\":\"$TEMPLATE_ID\"}" | json_get "['device_id']")
  echo "    criado: $DEVICE_ID"
else
  echo "    já existia: $DEVICE_ID"
fi

echo "==> Atuador"
ACTUATORS=$(curl -s "$GATEWAY/api/devices/devices/$DEVICE_ID/actuators" -H "$AUTH")
ACTUATOR_ID=$(echo "$ACTUATORS" | python3 -c "
import sys,json
d=json.load(sys.stdin)
items = d if isinstance(d, list) else d.get('data', [])
for a in items:
    if a.get('name') == 'Valvula':
        print(a['actuator_id']); break
" 2>/dev/null || true)
if [ -z "$ACTUATOR_ID" ]; then
  ACTUATOR_ID=$(curl -s -X POST "$GATEWAY/api/devices/devices/$DEVICE_ID/actuators" -H "$AUTH" -H "Content-Type: application/json" \
    -d "{\"name\":\"Valvula\",\"command_topic\":\"devices/$DEVICE_ID/cmd\",\"payload_schema\":{}}" | json_get "['actuator_id']")
  echo "    criado: $ACTUATOR_ID"
else
  echo "    já existia: $ACTUATOR_ID"
fi

make_rule() {
  local rule_name="$1" trigger="$2" action_payload="$3"
  local rules rule_id
  rules=$(curl -s "$GATEWAY/api/rules/rules" -H "$AUTH")
  rule_id=$(echo "$rules" | python3 -c "
import sys,json
d=json.load(sys.stdin)
items = d if isinstance(d, list) else d.get('data', [])
for r in items:
    if r.get('name') == '$rule_name':
        print(r['rule_id']); break
" 2>/dev/null || true)
  if [ -z "$rule_id" ]; then
    rule_id=$(curl -s -X POST "$GATEWAY/api/rules/rules" -H "$AUTH" -H "Content-Type: application/json" \
      -d "{\"name\":\"$rule_name\",\"trigger_condition\":\"$trigger\"}" | json_get "['rule_id']")
    curl -s -X POST "$GATEWAY/api/rules/rules/$rule_id/actions" -H "$AUTH" -H "Content-Type: application/json" \
      -d "{\"actuator_id\":\"$ACTUATOR_ID\",\"payload_template\":\"$action_payload\"}" > /dev/null
    echo "    criada: $rule_name ($rule_id)"
  else
    echo "    já existia: $rule_name ($rule_id)"
  fi
}

echo "==> Regras de automação (evento de calendário -> comando MQTT)"
make_rule "Regar no evento" "summary == 'Regar plantas'" '{\"state\":\"ON\"}'
make_rule "Luz na reuniao" "summary == 'Reuniao de equipe'" '{\"state\":\"MEETING_MODE\"}'

echo ""
echo "================================================================"
echo " Seed pronta. Login pra apresentação:"
echo "   URL:   $GATEWAY  (ou http://localhost:3000 direto)"
echo "   Email: $EMAIL"
echo "   Senha: $PASSWORD"
echo ""
echo " Device:   Bomba Jardim   ($DEVICE_ID)"
echo " Atuador:  Valvula        ($ACTUATOR_ID)"
echo " Regras cadastradas (dispare marcando evento com o mesmo título):"
echo "   - \"Regar plantas\"      -> liga a válvula"
echo "   - \"Reuniao de equipe\"  -> liga modo reunião"
echo ""
echo " Simular sensor respondendo (mostra no dashboard):"
echo "   mosquitto_pub -h localhost -p 1883 -t \"gateway.data/$DEVICE_ID\" -m '{\"payload\":{\"temp\":27.4}}'"
echo "================================================================"
