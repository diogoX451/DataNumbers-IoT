import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dot } from "@/components/ui/Dot";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { Pill } from "@/components/ui/Pill";
import { useTelemetryStream } from "@/lib/ws";

export const Route = createFileRoute("/_app/activity")({
  component: ActivityPage,
});

type Row = {
  id: string;
  time: string;
  topic: string;
  payload: string;
  deviceId: string;
};

function ActivityPage() {
  const [paused, setPaused] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState("");
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const { status } = useTelemetryStream({
    onMessage: (msg) => {
      if (pausedRef.current) return;
      setRows((prev) =>
        [
          {
            id: msg.event_id ?? `${Date.now()}-${Math.random()}`,
            time: new Date().toLocaleTimeString("pt-BR", { hour12: false }),
            topic: msg.topic,
            payload: JSON.stringify(msg.payload),
            deviceId: msg.device_id ?? "",
          },
          ...prev,
        ].slice(0, 200),
      );
    },
  });

  const filtered = rows.filter((r) =>
    filter
      ? r.topic.toLowerCase().includes(filter.toLowerCase()) ||
        r.payload.toLowerCase().includes(filter.toLowerCase())
      : true,
  );

  function exportJson() {
    const blob = new Blob([JSON.stringify(rows, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `datanumbers-activity-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const connected = status === "open";

  return (
    <PageShell
      crumbs={[
        { label: "Início", to: "/" },
        { label: "Atividade" },
      ]}
    >
      <PageHeader
        title="Atividade"
        subtitle="Stream contínuo de mensagens MQTT vindas via WebSocket"
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => setPaused((p) => !p)}
              disabled={!connected}
            >
              <Icon name={paused ? "play" : "pause"} size={14} />{" "}
              {paused ? "Retomar" : "Pausar"}
            </Button>
            <Button
              variant="secondary"
              onClick={exportJson}
              disabled={rows.length === 0}
            >
              <Icon name="download" size={14} /> Exportar JSON
            </Button>
          </>
        }
      />
      <Card noPadding>
        <div className="px-3.5 py-2.5 border-b border-border flex gap-2.5 items-center flex-wrap">
          <Pill tone={connected ? "success" : "danger"}>
            <Dot
              status={connected ? "online" : "error"}
              live={connected}
              size="sm"
            />
            {connected
              ? "Ao vivo"
              : status === "connecting"
                ? "Conectando…"
                : "Desconectado"}
          </Pill>
          <div className="relative flex-1 max-w-[320px]">
            <Icon
              name="search"
              size={13}
              className="absolute left-2.5 top-[9px] text-fg-subtle"
            />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filtrar por tópico ou payload…"
              className="w-full pl-8 pr-3 py-2 bg-bg-elev border border-border-strong rounded-sm text-[13px] outline-none focus:border-accent"
            />
          </div>
          <div className="flex-1" />
          <span className="text-[11px] text-fg-subtle font-mono">
            {filtered.length} eventos
          </span>
        </div>

        <div className="max-h-[640px] overflow-auto">
          <div className="grid grid-cols-[88px_220px_1fr] gap-3 px-4 py-2 border-b border-border bg-bg-subtle text-[10px] font-semibold text-fg-subtle uppercase tracking-wider sticky top-0">
            <div>Tempo</div>
            <div>Tópico</div>
            <div>Payload</div>
          </div>
          {filtered.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon="activity"
                title={connected ? "Sem eventos ainda" : "Aguardando conexão"}
                description={
                  connected
                    ? "Quando um dispositivo publicar telemetria, vai aparecer aqui em tempo real."
                    : "Tentando conectar ao gateway-emqx…"
                }
              />
            </div>
          ) : (
            <ul className="font-mono text-[12px]">
              {filtered.map((r) => (
                <li
                  key={r.id}
                  className="grid grid-cols-[88px_220px_1fr] gap-3 items-center px-4 py-2 border-b border-border"
                >
                  <span className="text-fg-subtle text-[11px]">{r.time}</span>
                  <span className="text-info text-[11px] truncate">
                    {r.topic}
                  </span>
                  <span className="text-fg-muted text-[11px] truncate">
                    {r.payload}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </PageShell>
  );
}
