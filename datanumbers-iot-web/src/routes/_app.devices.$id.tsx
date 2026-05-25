import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { qk, queries } from "@/api/queries";
import { actuatorsService, devicesService } from "@/api/services/devices";
import { PageHeader } from "@/components/PageHeader";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Dialog } from "@/components/ui/Dialog";
import { Dot } from "@/components/ui/Dot";
import { Icon } from "@/components/Icon";
import { Pill } from "@/components/ui/Pill";
import { Input, Label, Select } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import { Stat } from "@/components/Stat";
import { KV } from "@/components/KV";
import { LiveChart, type LivePoint } from "@/components/charts/LiveChart";
import { Table, TBody, TD, TR, TH, THead } from "@/components/ui/Table";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { ActuatorForm } from "@/components/forms/ActuatorForm";
import { errorMessage, useToast } from "@/components/ui/Toast";
import { useTelemetryStream } from "@/lib/ws";
import type {
  Actuator,
  CreateActuatorPayload,
  Device,
  UpdateDevicePayload,
} from "@/api/types";

export const Route = createFileRoute("/_app/devices/$id")({
  component: DeviceDetailPage,
});

const TABS = [
  { id: "overview", label: "Visão geral" },
  { id: "live", label: "Telemetria ao vivo" },
  { id: "actuators", label: "Atuadores" },
  { id: "history", label: "Histórico" },
  { id: "config", label: "Configurações" },
] as const;
type TabId = (typeof TABS)[number]["id"];

function DeviceDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const deviceQ = useQuery(queries.device(id));
  const [tab, setTab] = useState<TabId>("overview");

  if (deviceQ.isLoading) {
    return (
      <PageShell
        crumbs={[
          { label: "Início", to: "/" },
          { label: "Dispositivos", to: "/devices" },
          { label: id },
        ]}
      >
        <LoadingState />
      </PageShell>
    );
  }

  if (deviceQ.isError || !deviceQ.data) {
    return (
      <PageShell
        crumbs={[
          { label: "Início", to: "/" },
          { label: "Dispositivos", to: "/devices" },
          { label: id },
        ]}
      >
        <ErrorState
          title="Dispositivo não encontrado"
          description={errorMessage(deviceQ.error)}
          onRetry={() => deviceQ.refetch()}
        />
      </PageShell>
    );
  }

  const device = deviceQ.data;

  return (
    <PageShell
      crumbs={[
        { label: "Início", to: "/" },
        { label: "Dispositivos", to: "/devices" },
        { label: device.device_name },
      ]}
    >
      <PageHeader
        leading={
          <Button
            variant="ghost"
            size="sm"
            className="mb-1.5"
            onClick={() => navigate({ to: "/devices" })}
          >
            <Icon name="chevronLeft" size={13} /> Voltar
          </Button>
        }
        title={
          <span className="flex items-center gap-2.5">
            <Dot
              status={device.device_status === "ONLINE" ? "online" : "error"}
              live={device.device_status === "ONLINE"}
              size="md"
            />
            <span>{device.device_name}</span>
            <Pill tone={device.device_status === "ONLINE" ? "success" : "danger"}>
              <Icon name="radio" size={11} />
              {device.device_status === "ONLINE"
                ? "Recebendo dados"
                : "Desconectado"}
            </Pill>
          </span>
        }
        subtitle={
          <>
            <span className="font-mono text-[12px]">{device.device_id}</span>
            {device.template_name && <> · {device.template_name}</>}
          </>
        }
      />

      <Tabs items={TABS} active={tab} onChange={setTab} />

      {tab === "overview" && <OverviewTab device={device} />}
      {tab === "live" && <LiveTab device={device} />}
      {tab === "actuators" && <ActuatorsTab device={device} />}
      {tab === "history" && <HistoryTab device={device} />}
      {tab === "config" && <ConfigTab device={device} />}
    </PageShell>
  );
}

// -----------------------------------------------------------------------------
// Overview — stats + buffer WS
// -----------------------------------------------------------------------------

function OverviewTab({ device }: { device: Device }) {
  const { data: template } = useQuery(queries.template(device.template_id));

  // primeiro campo numérico do template — chave default pro gráfico
  const numericFields = useMemo(
    () =>
      (template?.fields ?? []).filter(
        (f) => f.type === "float" || f.type === "int",
      ),
    [template],
  );
  const primaryField = numericFields[0]?.name;

  const [live, setLive] = useState<LivePoint[]>([]);
  useTelemetryStream({
    onMessage: (msg) => {
      if (msg.device_id !== device.device_id) return;
      if (!primaryField) return;
      const v = msg.payload?.[primaryField];
      if (typeof v !== "number") return;
      setLive((prev) =>
        [...prev, { time: Date.now(), value: v }].slice(-60),
      );
    },
  });

  return (
    <div className="grid grid-cols-[1.5fr_1fr] gap-[18px]">
      <Card>
        <CardHeader
          title={
            primaryField ? `Telemetria · ${primaryField}` : "Telemetria ao vivo"
          }
          subtitle="Buffer dos últimos 60 pontos vindos via WebSocket"
        />
        <CardBody>
          {primaryField ? (
            live.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  icon="activity"
                  title="Aguardando o primeiro pacote"
                  description="Quando o dispositivo publicar telemetria, o gráfico aparece aqui."
                />
              </div>
            ) : (
              <LiveChart data={live} color="oklch(0.7 0.18 50)" height={240} />
            )
          ) : (
            <EmptyState
              icon="info"
              title="Template sem campo numérico"
              description="Adicione um campo float ou int no template pra ver o gráfico."
            />
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Conexão" />
        <CardBody className="flex flex-col gap-3.5">
          <KV label="Tópico de telemetria" value={device.mqtt_topic} mono copyable />
          <KV
            label="Tópico de comando (sugestão)"
            value={device.mqtt_topic.replace(".data/", ".cmd/")}
            mono
            copyable
          />
          <KV label="Status" value={device.device_status} />
          <KV label="Device ID" value={device.device_id} mono copyable />
          <KV label="Template ID" value={device.template_id} mono />
        </CardBody>
      </Card>

      <div className="col-span-2 grid grid-cols-4 gap-3.5">
        <Stat
          label="Status"
          value={device.device_status === "ONLINE" ? "Online" : "Offline"}
          color="var(--accent)"
        />
        <Stat
          label="Mensagens (60s)"
          value={live.length}
          color="oklch(0.65 0.13 230)"
        />
        <Stat
          label="Último valor"
          value={live[live.length - 1]?.value.toFixed(1) ?? "—"}
          unit={primaryField ?? ""}
          color="oklch(0.7 0.18 50)"
        />
        <Stat
          label="Campos do template"
          value={template?.fields?.length ?? "—"}
          color="oklch(0.72 0.15 165)"
        />
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Live — console de mensagens ao vivo
// -----------------------------------------------------------------------------

type LiveRow = {
  id: string;
  time: string;
  topic: string;
  payload: string;
};

function LiveTab({ device }: { device: Device }) {
  const [rows, setRows] = useState<LiveRow[]>([]);

  useTelemetryStream({
    onMessage: (msg) => {
      if (msg.device_id !== device.device_id) return;
      setRows((prev) =>
        [
          {
            id: `${Date.now()}-${Math.random()}`,
            time: new Date().toLocaleTimeString("pt-BR", { hour12: false }),
            topic: msg.topic,
            payload: JSON.stringify(msg.payload),
          },
          ...prev,
        ].slice(0, 200),
      );
    },
  });

  return (
    <Card>
      <CardHeader
        title="Console em tempo real"
        action={
          <Pill tone="success">
            <Dot status="online" live size="sm" /> Conectado
          </Pill>
        }
      />
      <div className="bg-bg-subtle font-mono text-[12px] p-4 h-[420px] overflow-auto">
        {rows.length === 0 ? (
          <div className="text-fg-subtle py-10 text-center">
            Aguardando mensagens…
          </div>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="flex gap-3 py-0.5">
              <span className="text-fg-subtle whitespace-nowrap">{r.time}</span>
              <span className="text-info shrink-0">{r.topic}</span>
              <span className="text-fg truncate">{r.payload}</span>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

// -----------------------------------------------------------------------------
// Actuators — CRUD inline
// -----------------------------------------------------------------------------

function ActuatorsTab({ device }: { device: Device }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Actuator | null>(null);
  const [deleting, setDeleting] = useState<Actuator | null>(null);

  const listQ = useQuery(queries.actuators(device.device_id));

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: qk.actuators(device.device_id) });

  const createM = useMutation({
    mutationFn: (payload: CreateActuatorPayload) =>
      actuatorsService.create(device.device_id, payload),
    onSuccess: () => {
      toast("Atuador criado", { variant: "success" });
      setCreateOpen(false);
      invalidate();
    },
    onError: (e) =>
      toast("Falha", { description: errorMessage(e), variant: "error" }),
  });

  const updateM = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: CreateActuatorPayload;
    }) => actuatorsService.update(id, payload),
    onSuccess: () => {
      toast("Atuador atualizado", { variant: "success" });
      setEditing(null);
      invalidate();
    },
    onError: (e) =>
      toast("Falha", { description: errorMessage(e), variant: "error" }),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => actuatorsService.remove(id),
    onSuccess: () => {
      toast("Atuador removido", { variant: "success" });
      setDeleting(null);
      invalidate();
    },
    onError: (e) =>
      toast("Falha", { description: errorMessage(e), variant: "error" }),
  });

  const items = listQ.data ?? [];
  const topicPrefix = device.mqtt_topic.replace(".data/", ".cmd/");

  return (
    <Card>
      <CardHeader
        title="Atuadores"
        subtitle="Saídas físicas controláveis por regras"
        action={
          <Button size="sm" variant="secondary" onClick={() => setCreateOpen(true)}>
            <Icon name="plus" size={12} /> Adicionar atuador
          </Button>
        }
      />
      {listQ.isLoading ? (
        <LoadingState />
      ) : listQ.isError ? (
        <ErrorState
          description={errorMessage(listQ.error)}
          onRetry={() => listQ.refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon="zap"
          title="Nenhum atuador ainda"
          description="Atuadores são gatilhados pelo rule-engine via tópico MQTT."
          action={
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Icon name="plus" size={12} /> Criar
            </Button>
          }
        />
      ) : (
        <div className="p-4 grid grid-cols-3 gap-3">
          {items.map((a) => (
            <div
              key={a.actuator_id}
              className="border border-border rounded-lg p-3.5"
            >
              <div className="flex items-center justify-between mb-2.5">
                <div className="w-[30px] h-[30px] rounded-md bg-bg-subtle text-fg-muted grid place-items-center">
                  <Icon name="bolt" size={15} />
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setEditing(a)}
                    className="w-7 h-7 grid place-items-center rounded text-fg-muted hover:bg-bg-hover hover:text-fg"
                    aria-label="Editar"
                  >
                    <Icon name="edit" size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(a)}
                    className="w-7 h-7 grid place-items-center rounded text-fg-muted hover:bg-danger-bg hover:text-danger"
                    aria-label="Remover"
                  >
                    <Icon name="trash" size={13} />
                  </button>
                </div>
              </div>
              <div className="font-semibold text-[13px]">{a.name}</div>
              <code className="block text-[10px] text-fg-subtle mt-1 overflow-hidden text-ellipsis whitespace-nowrap">
                {a.command_topic}
              </code>
              <div className="mt-2.5 p-2 bg-bg-subtle rounded font-mono text-[10px] text-fg-muted whitespace-pre-wrap break-all max-h-[80px] overflow-auto">
                {a.payload_schema
                  ? JSON.stringify(a.payload_schema, null, 2)
                  : "{}"}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Novo atuador"
        description="Será disparado quando uma regra apontar para esse atuador."
      >
        <ActuatorForm
          defaultTopicPrefix={`${topicPrefix}/`}
          onSubmit={(v) => createM.mutate(v)}
          onCancel={() => setCreateOpen(false)}
          submitLabel="Criar"
          pending={createM.isPending}
        />
      </Dialog>

      <Dialog
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Editar atuador"
      >
        {editing && (
          <ActuatorForm
            initial={editing}
            onSubmit={(v) =>
              updateM.mutate({ id: editing.actuator_id, payload: v })
            }
            onCancel={() => setEditing(null)}
            submitLabel="Salvar alterações"
            pending={updateM.isPending}
          />
        )}
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        title="Apagar atuador?"
        description={
          deleting ? `"${deleting.name}" será removido permanentemente.` : ""
        }
        destructive
        confirmLabel="Apagar"
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && deleteM.mutate(deleting.actuator_id)}
        loading={deleteM.isPending}
      />
    </Card>
  );
}

// -----------------------------------------------------------------------------
// History
// -----------------------------------------------------------------------------

function HistoryTab({ device }: { device: Device }) {
  const [limit, setLimit] = useState(50);
  const histQ = useQuery(queries.telemetry(device.device_id, { limit }));

  return (
    <Card noPadding>
      <CardHeader
        title="Histórico"
        subtitle={`Últimas ${limit} leituras persistidas pelo data-management`}
        action={
          <div className="flex items-center gap-2 text-[12px]">
            <span className="text-fg-muted">Mostrar</span>
            <Select
              value={String(limit)}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-24"
            >
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="500">500</option>
            </Select>
          </div>
        }
      />
      {histQ.isLoading ? (
        <LoadingState />
      ) : histQ.isError ? (
        <ErrorState
          description={errorMessage(histQ.error)}
          onRetry={() => histQ.refetch()}
        />
      ) : (histQ.data ?? []).length === 0 ? (
        <EmptyState
          icon="book"
          title="Sem leituras ainda"
          description="O dispositivo precisa ter publicado pelo menos uma mensagem pra aparecer aqui."
        />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH className="w-44">Horário</TH>
              <TH>Payload</TH>
              <TH className="w-44">Event ID</TH>
            </tr>
          </THead>
          <TBody>
            {(histQ.data ?? []).map((r) => (
              <TR key={r.event_id || r.time}>
                <TD className="font-mono text-[11px] text-fg-muted">
                  {new Date(r.time).toLocaleString("pt-BR")}
                </TD>
                <TD>
                  <code className="text-[11px] text-fg">
                    {JSON.stringify(r.payload)}
                  </code>
                </TD>
                <TD className="font-mono text-[11px] text-fg-subtle">
                  {r.event_id ? `${r.event_id.slice(0, 8)}…` : "—"}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </Card>
  );
}

// -----------------------------------------------------------------------------
// Config — PUT no device-manager
// -----------------------------------------------------------------------------

function ConfigTab({ device }: { device: Device }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: templates = [] } = useQuery(queries.templates());
  const [name, setName] = useState(device.device_name);
  const [templateId, setTemplateId] = useState(device.template_id);
  const [status, setStatus] = useState(device.device_status);

  useEffect(() => {
    setName(device.device_name);
    setTemplateId(device.template_id);
    setStatus(device.device_status);
  }, [device]);

  const m = useMutation({
    mutationFn: (payload: UpdateDevicePayload) =>
      devicesService.update(device.device_id, payload),
    onSuccess: () => {
      toast("Configurações salvas", { variant: "success" });
      queryClient.invalidateQueries({ queryKey: qk.device(device.device_id) });
      queryClient.invalidateQueries({ queryKey: qk.devices() });
    },
    onError: (e) =>
      toast("Falha ao salvar", {
        description: errorMessage(e),
        variant: "error",
      }),
  });

  const dirty =
    name !== device.device_name ||
    templateId !== device.template_id ||
    status !== device.device_status;

  return (
    <Card>
      <CardHeader title="Configurações do dispositivo" />
      <CardBody>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!dirty) return;
            m.mutate({
              device_name: name,
              template_id: templateId,
              device_status: status,
            });
          }}
          className="grid grid-cols-2 gap-4"
        >
          <div>
            <Label>Nome amigável</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="ONLINE">ONLINE</option>
              <option value="OFFLINE">OFFLINE</option>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Template</Label>
            <Select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
            >
              {templates.map((t) => (
                <option key={t.template_id} value={t.template_id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="col-span-2 flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setName(device.device_name);
                setTemplateId(device.template_id);
                setStatus(device.device_status);
              }}
              disabled={!dirty || m.isPending}
            >
              Desfazer
            </Button>
            <Button type="submit" disabled={!dirty || m.isPending}>
              {m.isPending ? "Salvando…" : "Salvar alterações"}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
