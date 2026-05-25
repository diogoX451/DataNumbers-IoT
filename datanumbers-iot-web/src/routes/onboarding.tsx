import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { templatesService } from "@/api/services/templates";
import { devicesService } from "@/api/services/devices";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Dot } from "@/components/ui/Dot";
import { Icon, type IconName } from "@/components/Icon";
import { Hint, Input, Label } from "@/components/ui/Input";
import { KV } from "@/components/KV";
import { isAuthenticated, isTokenExpired } from "@/lib/auth";
import { errorMessage, useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import type { Device, Template, TemplateField } from "@/api/types";

export const Route = createFileRoute("/onboarding")({
  beforeLoad: ({ location }) => {
    if (!isAuthenticated() || isTokenExpired()) {
      throw redirect({
        to: "/sign-in",
        search: { redirect: location.href },
      });
    }
  },
  component: OnboardingPage,
});

type Board = {
  id: string;
  name: string;
  sub: string;
  icon: IconName;
};

const BOARDS: Board[] = [
  { id: "esp32", name: "ESP32", sub: "Wi-Fi · MicroPython/Arduino", icon: "cpu" },
  { id: "esp8266", name: "ESP8266", sub: "Wi-Fi · NodeMCU", icon: "cpu" },
  { id: "rpi", name: "Raspberry Pi", sub: "Linux · Python", icon: "box" },
  { id: "arduino", name: "Arduino + ENC28J60", sub: "Ethernet", icon: "cpu" },
  { id: "lora", name: "LoRa Gateway", sub: "Sub-GHz · longo alcance", icon: "radio" },
  { id: "sim", name: "Simulador", sub: "Sem hardware · só pra testar", icon: "terminal" },
];

const STEPS = [
  { title: "Que dispositivo você quer conectar?", sub: "Escolha sua placa pra gerar o código de exemplo" },
  { title: "Crie um template", sub: 'Defina o "molde" dos dados que esse tipo de dispositivo manda' },
  { title: "Cadastre o dispositivo", sub: "Identifique o hardware na sua conta" },
  { title: "Cole o código no firmware", sub: "Quase lá — dois cliques e seu device fala com a nuvem" },
  { title: "Pronto!", sub: "Aguarde a primeira leitura aparecer" },
];

function OnboardingPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [board, setBoard] = useState("esp32");

  const [tplName, setTplName] = useState("Sensor Ambiental");
  const [tplDesc, setTplDesc] = useState("DHT22 enviando temperatura e umidade");
  const [sensors, setSensors] = useState<TemplateField[]>([
    { name: "temp", type: "float", required: true },
    { name: "humidity", type: "float", required: false },
  ]);
  const [createdTemplate, setCreatedTemplate] = useState<Template | null>(null);

  const [devName, setDevName] = useState("Sensor da Sala");
  const [createdDevice, setCreatedDevice] = useState<Device | null>(null);

  const createTemplateM = useMutation({
    mutationFn: () =>
      templatesService.create({
        name: tplName,
        description: tplDesc,
        fields: sensors,
      }),
    onSuccess: (tpl) => {
      setCreatedTemplate(tpl);
      toast("Template criado", { variant: "success" });
      setStep(2);
    },
    onError: (e) =>
      toast("Falha ao criar template", {
        description: errorMessage(e),
        variant: "error",
      }),
  });

  const createDeviceM = useMutation({
    mutationFn: () => {
      if (!createdTemplate) throw new Error("Template não criado");
      return devicesService.create({
        device_name: devName,
        template_id: createdTemplate.template_id,
      });
    },
    onSuccess: (dev) => {
      setCreatedDevice(dev);
      toast("Dispositivo criado", { variant: "success" });
      setStep(3);
    },
    onError: (e) =>
      toast("Falha ao cadastrar device", {
        description: errorMessage(e),
        variant: "error",
      }),
  });

  function handleNext() {
    if (step === 0) {
      setStep(1);
      return;
    }
    if (step === 1) {
      createTemplateM.mutate();
      return;
    }
    if (step === 2) {
      createDeviceM.mutate();
      return;
    }
    if (step === 3) {
      setStep(4);
      return;
    }
    if (step === 4) {
      navigate({ to: "/" });
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-[360px_1fr]">
      <aside className="bg-bg-elev border-r border-border px-7 py-8 flex flex-col">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-[26px] h-[26px] rounded-md grid place-items-center text-white font-extrabold text-[13px] tracking-tighter bg-gradient-to-br from-accent to-[oklch(0.62_0.2_285)]">
            d.
          </div>
          <div className="font-bold">DataNumbers</div>
        </div>
        <div className="text-[11px] uppercase tracking-wider text-fg-subtle font-semibold mt-6">
          Configuração inicial
        </div>
        <ol className="flex flex-col gap-1 mt-3">
          {STEPS.map((s, i) => {
            const done = i < step;
            const current = i === step;
            return (
              <li
                key={i}
                className={cn(
                  "flex gap-3 px-3 py-2.5 rounded",
                  current && "bg-bg-subtle",
                )}
              >
                <span
                  className={cn(
                    "w-[22px] h-[22px] rounded-full grid place-items-center text-[11px] font-bold border-[1.5px] shrink-0",
                    done && "bg-success border-success text-white",
                    current && !done && "border-accent text-accent",
                    !done && !current && "border-border-strong text-fg-muted",
                  )}
                >
                  {done ? <Icon name="check" size={12} /> : i + 1}
                </span>
                <div>
                  <div className="text-[13px] font-semibold leading-tight">
                    {s.title}
                  </div>
                  <div className="text-[11px] text-fg-muted leading-tight">
                    {s.sub}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        <div className="mt-auto text-[11px] text-fg-subtle">
          <div className="p-3 bg-bg-subtle rounded border border-border">
            <div className="font-semibold text-fg mb-1 flex items-center gap-1">
              <Icon name="info" size={11} /> Dica
            </div>
            Os passos 2 e 3 já criam o template e o dispositivo de verdade no
            backend.
          </div>
        </div>
      </aside>

      <main className="px-16 py-14 flex flex-col max-w-[720px]">
        <div className="text-[12px] text-fg-subtle mb-1.5">
          Passo {step + 1} de {STEPS.length}
        </div>
        <h1 className="text-[28px] font-bold tracking-tight mb-2">
          {STEPS[step].title}
        </h1>
        <p className="text-sm text-fg-muted mb-8">{STEPS[step].sub}</p>

        {step === 0 && (
          <div className="grid grid-cols-3 gap-2.5">
            {BOARDS.map((b) => {
              const selected = board === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBoard(b.id)}
                  className={cn(
                    "text-left border rounded p-3.5 transition-colors",
                    selected
                      ? "border-accent bg-accent-bg"
                      : "border-border hover:border-border-strong",
                  )}
                >
                  <div
                    className={cn(
                      "w-7 h-7 rounded-sm grid place-items-center mb-2",
                      selected
                        ? "bg-accent text-white"
                        : "bg-bg-subtle text-fg-muted",
                    )}
                  >
                    <Icon name={b.icon} size={14} />
                  </div>
                  <div className="font-semibold text-[13px]">{b.name}</div>
                  <div className="text-[11px] text-fg-muted mt-0.5">{b.sub}</div>
                </button>
              );
            })}
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div>
              <Label>Nome do template</Label>
              <Input
                value={tplName}
                onChange={(e) => setTplName(e.target.value)}
                required
              />
              <Hint>Esse template pode ser reusado em vários dispositivos.</Hint>
            </div>
            <div>
              <Label>Descrição</Label>
              <Input
                value={tplDesc}
                onChange={(e) => setTplDesc(e.target.value)}
              />
            </div>
            <div>
              <Label>Sensores</Label>
              <div className="flex flex-wrap gap-1.5 p-2.5 border border-border rounded bg-bg-subtle">
                {sensors.map((s, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border border-border text-[12px] bg-bg-elev"
                  >
                    <Icon name="gauge" size={11} />
                    <Input
                      value={s.name}
                      onChange={(e) =>
                        setSensors((prev) =>
                          prev.map((x, j) =>
                            j === i ? { ...x, name: e.target.value } : x,
                          ),
                        )
                      }
                      className="w-20 py-0.5 px-1 text-[11px] font-mono"
                    />
                    <code className="text-[11px] text-fg-muted">{s.type}</code>
                    <button
                      type="button"
                      className="w-4 h-4 rounded grid place-items-center text-fg-subtle hover:bg-bg-hover hover:text-danger"
                      onClick={() =>
                        setSensors(sensors.filter((_, j) => j !== i))
                      }
                      aria-label="Remover"
                    >
                      <Icon name="x" size={10} />
                    </button>
                  </span>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() =>
                    setSensors([
                      ...sensors,
                      { name: "valor", type: "float", required: false },
                    ])
                  }
                >
                  <Icon name="plus" size={11} /> Sensor
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div>
              <Label>Nome amigável</Label>
              <Input
                value={devName}
                onChange={(e) => setDevName(e.target.value)}
                placeholder="Ex.: Sensor da Sala"
                required
              />
            </div>
            <Card className="bg-bg-subtle">
              <CardBody className="p-3.5">
                <div className="text-[11px] font-semibold text-fg-muted mb-1.5">
                  TEMPLATE
                </div>
                <div className="text-[13px] font-semibold">
                  {createdTemplate?.name ?? tplName}
                </div>
                <div className="text-[11px] text-fg-muted mt-0.5">
                  {sensors.length} sensor(es) ·{" "}
                  {sensors.map((s) => s.name).join(", ")}
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {step === 3 && createdDevice && (
          <Card className="bg-bg-subtle">
            <CardBody>
              <div className="text-[11px] font-semibold text-fg-muted mb-3">
                Suas credenciais MQTT
              </div>
              <div className="grid grid-cols-2 gap-3">
                <KV label="Broker" value="mqtt://localhost:1883" mono copyable />
                <KV
                  label="Tópico de telemetria"
                  value={createdDevice.mqtt_topic}
                  mono
                  copyable
                />
                <KV
                  label="Device ID (use como client_id)"
                  value={createdDevice.device_id}
                  mono
                  copyable
                />
                <KV
                  label="Template"
                  value={
                    createdDevice.template_name ?? createdDevice.template_id
                  }
                />
              </div>
              <div className="mt-4 p-3 bg-bg-elev border border-border rounded font-mono text-[12px] whitespace-pre overflow-x-auto">
                {firmwareSample(
                  createdDevice.mqtt_topic,
                  createdDevice.device_id,
                  board,
                )}
              </div>
            </CardBody>
          </Card>
        )}

        {step === 4 && (
          <div className="text-center py-10">
            <div className="w-20 h-20 rounded-full bg-success-bg text-success grid place-items-center mx-auto mb-5">
              <Icon name="checkCircle" size={40} />
            </div>
            <h2 className="text-[22px] font-bold mb-2">Tudo pronto!</h2>
            <p className="text-fg-muted mb-6">
              Estamos aguardando a primeira mensagem de{" "}
              <b>{createdDevice?.device_name ?? devName}</b>
            </p>
            <Card className="max-w-[380px] mx-auto text-left">
              <CardBody className="p-5">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <Dot status="online" live />
                  <b>Aguardando primeiro pacote…</b>
                </div>
                <div className="text-[12px] text-fg-muted">
                  Ligue o dispositivo. Ele aparece na tela inicial
                  automaticamente quando enviar a primeira leitura.
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        <div className="flex gap-2.5 mt-10">
          <Button
            variant="ghost"
            onClick={() =>
              step > 0 ? setStep(step - 1) : navigate({ to: "/" })
            }
            disabled={createTemplateM.isPending || createDeviceM.isPending}
          >
            {step > 0 ? "← Voltar" : "Cancelar"}
          </Button>
          <div className="flex-1" />
          <Button
            size="lg"
            onClick={handleNext}
            disabled={
              (step === 1 && createTemplateM.isPending) ||
              (step === 2 && createDeviceM.isPending) ||
              (step === 1 && !tplName.trim()) ||
              (step === 2 && !devName.trim())
            }
          >
            {step === 1 && createTemplateM.isPending
              ? "Criando template…"
              : step === 2 && createDeviceM.isPending
                ? "Criando dispositivo…"
                : step === STEPS.length - 1
                  ? "Ir para o dashboard"
                  : "Continuar"}
            <Icon name="arrowRight" size={14} />
          </Button>
        </div>
      </main>
    </div>
  );
}

function firmwareSample(topic: string, clientId: string, board: string): string {
  if (board === "sim") {
    return `# simulador (Python)
import paho.mqtt.client as mqtt, json, time, random
c = mqtt.Client("${clientId}")
c.connect("localhost", 1883)
while True:
    msg = json.dumps({"temp": 20 + random.random()*10, "humidity": 60 + random.random()*15})
    c.publish("${topic}", msg)
    time.sleep(5)`;
  }
  return `// ESP32 / Arduino
#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>

const char* MQTT_HOST = "<seu-broker>";
const char* TOPIC     = "${topic}";

DHT dht(23, DHT22);
WiFiClient net;
PubSubClient mqtt(net);

void setup() {
  WiFi.begin("SUA_REDE", "SENHA");
  mqtt.setServer(MQTT_HOST, 1883);
  mqtt.connect("${clientId}");
  dht.begin();
}

void loop() {
  char buf[64];
  snprintf(buf, 64, "{\\"temp\\":%.1f,\\"humidity\\":%.0f}",
           dht.readTemperature(), dht.readHumidity());
  mqtt.publish(TOPIC, buf);
  delay(5000);
}`;
}
