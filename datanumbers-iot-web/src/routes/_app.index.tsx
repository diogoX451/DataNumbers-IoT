import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { queries } from "@/api/queries";
import { PageHeader } from "@/components/PageHeader";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Dot } from "@/components/ui/Dot";
import { Pill } from "@/components/ui/Pill";
import { Icon } from "@/components/Icon";
import { HealthCard } from "@/components/HealthCard";
import { Stat } from "@/components/Stat";
import { Table, TBody, TD, TR } from "@/components/ui/Table";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/ui/States";
import { useTelemetryStream } from "@/lib/ws";
import type { Device } from "@/api/types";

export const Route = createFileRoute("/_app/")({
  component: HomePage,
});

function HomePage() {
  const { data: me } = useQuery(queries.me());
  const devicesQ = useQuery(queries.devices());
  const { data: spaces = [] } = useQuery(queries.scenarios());

  const devices = devicesQ.data ?? [];
  const online = devices.filter((d) => d.device_status === "ONLINE").length;
  const total = devices.length;
  const healthPct = total > 0 ? Math.round((online / total) * 100) : 0;
  const problems = devices.filter((d) => d.device_status !== "ONLINE");

  const navigate = useNavigate();

  const { recent, msgsPerMin } = useLiveActivity();
  const greeting = useMemo(() => greetingFor(new Date()), []);
  const firstName = me?.Name.split(" ")[0] ?? "";

  return (
    <PageShell crumbs={[{ label: "Início" }]}>
      <PageHeader
        title={
          <>
            {greeting}
            {firstName ? `, ${firstName}` : ""} <span aria-hidden>👋</span>
          </>
        }
        subtitle={
          devicesQ.isLoading ? (
            "Carregando frota…"
          ) : (
            <>
              Sua frota está <b className="text-fg">{healthPct}%</b> saudável ·{" "}
              {online} de {total} dispositivos online
            </>
          )
        }
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => navigate({ to: "/activity" })}
            >
              <Icon name="activity" size={14} /> Atividade ao vivo
            </Button>
            <Button onClick={() => navigate({ to: "/onboarding" })}>
              <Icon name="plus" size={14} /> Novo dispositivo
            </Button>
          </>
        }
      />

      <div className="mb-4">
        <HealthCard
          status={problems.length > 0 ? "warn" : "ok"}
          title={
            problems.length > 0
              ? `${problems.length} dispositivo${problems.length > 1 ? "s" : ""} precisa${problems.length > 1 ? "m" : ""} de atenção`
              : "Tudo correndo bem"
          }
          subtitle={
            devices.length === 0
              ? "Você ainda não conectou nenhum dispositivo."
              : `Última verificação agora · ${online}/${total} online`
          }
          metrics={[
            {
              label: "Mensagens / min",
              value: msgsPerMin.toLocaleString("pt-BR"),
            },
            { label: "Latência média", value: "34ms" },
            { label: "Uptime 24h", value: "99.4%" },
          ]}
        />
      </div>

      <div className="grid grid-cols-4 gap-3.5 mb-4">
        <Stat
          label="Temperatura média"
          value="26.4"
          unit="°C"
          delta="+0.6"
          deltaDir="up"
          spark={demoSparks.temp}
          color="oklch(0.7 0.18 50)"
        />
        <Stat
          label="Umidade média"
          value="63"
          unit="%"
          delta="-2"
          deltaDir="down"
          spark={demoSparks.humidity}
          color="oklch(0.65 0.13 230)"
        />
        <Stat
          label="Mensagens 24h"
          value="3.2k"
          delta="+12%"
          deltaDir="up"
          spark={demoSparks.messages}
          color="var(--accent)"
        />
        <Stat
          label="Regras disparadas"
          value="6"
          delta="+2"
          deltaDir="up"
          spark={demoSparks.rules}
          color="oklch(0.72 0.15 165)"
        />
      </div>

      <div className="grid grid-cols-[1.6fr_1fr] gap-[18px]">
        <Card noPadding>
          <CardHeader
            title="Precisam de atenção"
            subtitle="Dispositivos com algum problema agora"
            action={
              <Link to="/devices">
                <Button variant="ghost" size="sm">
                  Ver todos <Icon name="arrowRight" size={12} />
                </Button>
              </Link>
            }
          />
          {devicesQ.isLoading ? (
            <LoadingState />
          ) : problems.length === 0 ? (
            <EmptyState
              icon="checkCircle"
              title="Nenhum problema agora"
              description="Quando algum dispositivo ficar offline ou alertar, ele aparece aqui."
            />
          ) : (
            <Table>
              <TBody>
                {problems.map((d) => (
                  <AttentionRow
                    key={d.device_id}
                    device={d}
                    onClick={() =>
                      navigate({
                        to: "/devices/$id",
                        params: { id: d.device_id },
                      })
                    }
                  />
                ))}
              </TBody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader title="Atividade recente" subtitle="Stream MQTT" />
          {recent.length === 0 ? (
            <EmptyState
              icon="activity"
              title="Aguardando telemetria"
              description="Conecte um dispositivo e as leituras aparecerão aqui em tempo real."
            />
          ) : (
            <div className="py-1">
              {recent.map((r, i) => (
                <div
                  key={r.id}
                  className={`flex gap-3 px-[18px] py-2.5 ${
                    i > 0 ? "border-t border-border" : ""
                  }`}
                >
                  <span className="w-6 h-6 rounded grid place-items-center bg-info-bg text-info shrink-0">
                    <Icon name="radio" size={12} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-medium truncate font-mono">
                      {r.topic}
                    </div>
                    <div className="text-[11px] text-fg-subtle truncate font-mono">
                      {r.preview}
                    </div>
                  </div>
                  <div className="text-[11px] text-fg-subtle whitespace-nowrap">
                    {r.when}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <section className="mt-6">
        <div className="flex justify-between items-baseline mb-3">
          <div>
            <h3 className="m-0 text-sm font-semibold">Seus spaces</h3>
            <p className="m-0 mt-0.5 text-[12px] text-fg-muted">
              Cenários que agrupam dispositivos e regras
            </p>
          </div>
          <Link to="/spaces">
            <Button variant="ghost" size="sm">
              Ver todos <Icon name="arrowRight" size={12} />
            </Button>
          </Link>
        </div>
        {spaces.length === 0 ? (
          <Card>
            <CardBody>
              <EmptyState
                icon="folder"
                title="Você ainda não tem spaces"
                description="Crie um space pra agrupar dispositivos por ambiente (ex.: estufa, pomar)."
                action={
                  <Link to="/spaces">
                    <Button size="sm">
                      <Icon name="plus" size={12} /> Criar space
                    </Button>
                  </Link>
                }
              />
            </CardBody>
          </Card>
        ) : (
          <div className="grid grid-cols-3 gap-3.5">
            {spaces.slice(0, 6).map((s) => (
              <Link
                key={s.scenario_id}
                to="/spaces/$id"
                params={{ id: s.scenario_id }}
                className="block"
              >
                <Card className="cursor-pointer hover:shadow transition-shadow">
                  <CardBody className="p-4">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-lg grid place-items-center text-white"
                        style={{ background: colorForSpace(s.scenario_id) }}
                      >
                        <Icon name="folder" size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[13px] truncate">
                          {s.name}
                        </div>
                        <div className="text-[11px] text-fg-muted truncate">
                          {s.description || "Sem descrição"}
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

    </PageShell>
  );
}

/**
 * Sparklines da home — séries determinísticas com leve variação no carregamento
 * para o card não parecer estático. O backend ainda não expõe esses agregados
 * por tenant (`/api/data/...` é por device), então é placeholder visual até
 * termos endpoint próprio.
 */
const demoSparks = {
  temp: Array.from({ length: 24 }, (_, i) => 24 + Math.sin(i / 3) * 3 + Math.random() * 1.5),
  humidity: Array.from({ length: 24 }, (_, i) => 60 + Math.cos(i / 4) * 8 + Math.random() * 2),
  messages: Array.from({ length: 24 }, () => 80 + Math.random() * 40),
  rules: Array.from({ length: 24 }, () => 1 + Math.random() * 4),
};

function AttentionRow({
  device,
  onClick,
}: {
  device: Device;
  onClick: () => void;
}) {
  return (
    <TR clickable onClick={onClick}>
      <TD className="w-9">
        <Dot status={device.device_status === "OFFLINE" ? "error" : "warn"} />
      </TD>
      <TD>
        <div className="font-medium">{device.device_name}</div>
        <div className="text-[11px] text-fg-subtle font-mono">
          {device.device_id.slice(0, 8)}…
        </div>
      </TD>
      <TD>
        <Pill>{device.template_name ?? "—"}</Pill>
      </TD>
      <TD>
        <Pill tone={device.device_status === "OFFLINE" ? "danger" : "warn"}>
          <Icon
            name={device.device_status === "OFFLINE" ? "wifiOff" : "alert"}
            size={10}
          />
          {device.device_status}
        </Pill>
      </TD>
      <TD className="w-8">
        <Icon name="chevronRight" size={14} />
      </TD>
    </TR>
  );
}

type RecentItem = {
  id: string;
  topic: string;
  preview: string;
  when: string;
};

function useLiveActivity() {
  const [items, setItems] = useState<RecentItem[]>([]);
  const windowRef = useRef<number[]>([]);
  const [msgsPerMin, setMpm] = useState(0);

  useTelemetryStream({
    onMessage: (msg) => {
      const now = Date.now();
      windowRef.current.push(now);
      windowRef.current = windowRef.current.filter((t) => now - t < 60_000);
      setMpm(windowRef.current.length);

      setItems((prev) =>
        [
          {
            id: msg.event_id ?? `${now}-${Math.random()}`,
            topic: msg.topic,
            preview: JSON.stringify(msg.payload),
            when: new Date(now).toLocaleTimeString("pt-BR", { hour12: false }),
          },
          ...prev,
        ].slice(0, 6),
      );
    },
  });

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      windowRef.current = windowRef.current.filter((t) => now - t < 60_000);
      setMpm(windowRef.current.length);
    }, 5_000);
    return () => window.clearInterval(id);
  }, []);

  return { recent: items, msgsPerMin };
}

function greetingFor(d: Date): string {
  const h = d.getHours();
  if (h < 6) return "Boa madrugada";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

/**
 * Backend não armazena cor de scenarios. Em vez de hash → hue aleatório (que
 * gerava marrons e cores feias), escolhemos de uma paleta curada de tons
 * agradáveis. O id define o índice de forma estável.
 */
const SPACE_PALETTE = [
  "oklch(0.72 0.15 165)", // verde-azulado (Estufa)
  "oklch(0.78 0.16 90)", //  amarelo-oliva (Pomar)
  "oklch(0.7 0.13 230)", //  azul (Externo)
  "oklch(0.7 0.16 320)", //  rosa-magenta
  "oklch(0.72 0.14 30)", //  laranja
  "oklch(0.7 0.13 280)", //  roxo
];

export function colorForSpace(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xfffffff;
  return SPACE_PALETTE[h % SPACE_PALETTE.length];
}
