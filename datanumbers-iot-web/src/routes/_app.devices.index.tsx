import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { qk, queries } from "@/api/queries";
import { devicesService } from "@/api/services/devices";
import { PageHeader } from "@/components/PageHeader";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Dialog } from "@/components/ui/Dialog";
import { Dot } from "@/components/ui/Dot";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { Pill } from "@/components/ui/Pill";
import { Input } from "@/components/ui/Input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { DeviceForm } from "@/components/forms/DeviceForm";
import { errorMessage, useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import type { CreateDevicePayload, Device } from "@/api/types";

export const Route = createFileRoute("/_app/devices/")({
  component: DevicesPage,
});

type Filter = "all" | "online" | "offline";
type View = "list" | "grid";

function DevicesPage() {
  const { data: devices, isLoading, error, refetch } = useQuery(
    queries.devices(),
  );
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [filter, setFilter] = useState<Filter>("all");
  const [view, setView] = useState<View>("list");
  const [q, setQ] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleting, setDeleting] = useState<Device | null>(null);

  const list = devices ?? [];
  const filtered = useMemo(
    () =>
      list.filter((d) => {
        if (filter === "online" && d.device_status !== "ONLINE") return false;
        if (filter === "offline" && d.device_status === "ONLINE") return false;
        if (q && !d.device_name.toLowerCase().includes(q.toLowerCase()))
          return false;
        return true;
      }),
    [list, filter, q],
  );

  const onlineCount = list.filter((d) => d.device_status === "ONLINE").length;
  const offlineCount = list.length - onlineCount;

  const createM = useMutation({
    mutationFn: (payload: CreateDevicePayload) => devicesService.create(payload),
    onSuccess: () => {
      toast("Dispositivo criado", { variant: "success" });
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: qk.devices() });
    },
    onError: (e) =>
      toast("Falha ao criar dispositivo", {
        description: errorMessage(e),
        variant: "error",
      }),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => devicesService.remove(id),
    onSuccess: () => {
      toast("Dispositivo removido", { variant: "success" });
      setDeleting(null);
      queryClient.invalidateQueries({ queryKey: qk.devices() });
    },
    onError: (e) =>
      toast("Falha ao remover", {
        description: errorMessage(e),
        variant: "error",
      }),
  });

  return (
    <PageShell
      crumbs={[
        { label: "Início", to: "/" },
        { label: "Dispositivos" },
      ]}
    >
      <PageHeader
        title="Dispositivos"
        subtitle="Gerencie todo seu hardware conectado"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Icon name="plus" size={14} /> Novo dispositivo
          </Button>
        }
      />

      <Card noPadding>
        <div className="px-3.5 py-3 flex items-center gap-2 border-b border-border flex-wrap">
          <SegmentedFilter
            value={filter}
            onChange={setFilter}
            counts={{
              all: list.length,
              online: onlineCount,
              offline: offlineCount,
            }}
          />
          <div className="relative flex-1 max-w-[260px]">
            <Icon
              name="search"
              size={13}
              className="absolute left-2.5 top-[9px] text-fg-subtle"
            />
            <Input
              placeholder="Buscar dispositivo…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="flex-1" />
          <ViewToggle view={view} onChange={setView} />
        </div>

        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState
            description={errorMessage(error)}
            onRetry={() => refetch()}
          />
        ) : list.length === 0 ? (
          <EmptyState
            icon="cpu"
            title="Nenhum dispositivo ainda"
            description="Crie seu primeiro dispositivo pra começar a receber dados."
            action={
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Icon name="plus" size={12} /> Novo dispositivo
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="search"
            title="Nada bate com esses filtros"
            description="Tente limpar a busca ou trocar o status."
          />
        ) : view === "list" ? (
          <Table>
            <THead>
              <tr>
                <TH className="w-9" />
                <TH>Dispositivo</TH>
                <TH>Template</TH>
                <TH>Status</TH>
                <TH>Tópico MQTT</TH>
                <TH className="w-20" />
              </tr>
            </THead>
            <TBody>
              {filtered.map((d) => (
                <DeviceRow
                  key={d.device_id}
                  device={d}
                  onClick={() =>
                    navigate({ to: "/devices/$id", params: { id: d.device_id } })
                  }
                  onDelete={() => setDeleting(d)}
                />
              ))}
            </TBody>
          </Table>
        ) : (
          <DeviceGrid
            devices={filtered}
            onClick={(d) =>
              navigate({ to: "/devices/$id", params: { id: d.device_id } })
            }
          />
        )}
      </Card>

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Novo dispositivo"
        description="O tópico MQTT é gerado pelo backend a partir do device_id."
      >
        <DeviceForm
          onSubmit={(v) => createM.mutate(v)}
          onCancel={() => setCreateOpen(false)}
          submitLabel="Criar"
          pending={createM.isPending}
        />
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        title="Apagar dispositivo?"
        description={
          deleting
            ? `"${deleting.device_name}" será removido permanentemente. Telemetria histórica continua no banco mas o device não receberá mais novos dados.`
            : ""
        }
        destructive
        confirmLabel="Apagar"
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && deleteM.mutate(deleting.device_id)}
        loading={deleteM.isPending}
      />
    </PageShell>
  );
}

function DeviceRow({
  device,
  onClick,
  onDelete,
}: {
  device: Device;
  onClick: () => void;
  onDelete: () => void;
}) {
  return (
    <TR>
      <TD className="cursor-pointer" onClick={onClick}>
        <Dot
          status={
            device.device_status === "ONLINE"
              ? "online"
              : device.device_status === "OFFLINE"
                ? "error"
                : "warn"
          }
          live={device.device_status === "ONLINE"}
        />
      </TD>
      <TD className="cursor-pointer" onClick={onClick}>
        <div className="font-medium">{device.device_name}</div>
        <div className="text-[11px] text-fg-subtle font-mono">
          {device.device_id.slice(0, 8)}…
        </div>
      </TD>
      <TD className="cursor-pointer" onClick={onClick}>
        <Pill>{device.template_name ?? "—"}</Pill>
      </TD>
      <TD className="cursor-pointer" onClick={onClick}>
        <Pill
          tone={
            device.device_status === "ONLINE"
              ? "success"
              : device.device_status === "OFFLINE"
                ? "danger"
                : "warn"
          }
        >
          {device.device_status}
        </Pill>
      </TD>
      <TD className="cursor-pointer" onClick={onClick}>
        <code className="text-[11px] text-fg-muted">{device.mqtt_topic}</code>
      </TD>
      <TD>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onClick}
            className="w-7 h-7 grid place-items-center rounded text-fg-muted hover:bg-bg-hover hover:text-fg"
            aria-label="Abrir"
          >
            <Icon name="chevronRight" size={13} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="w-7 h-7 grid place-items-center rounded text-fg-muted hover:bg-danger-bg hover:text-danger"
            aria-label="Remover"
          >
            <Icon name="trash" size={13} />
          </button>
        </div>
      </TD>
    </TR>
  );
}

function DeviceGrid({
  devices,
  onClick,
}: {
  devices: Device[];
  onClick: (d: Device) => void;
}) {
  return (
    <div className="p-4 grid gap-3 grid-cols-[repeat(auto-fill,minmax(240px,1fr))]">
      {devices.map((d) => (
        <button
          key={d.device_id}
          type="button"
          onClick={() => onClick(d)}
          className="text-left border border-border rounded-lg p-3.5 bg-bg-elev hover:shadow transition-shadow"
        >
          <div className="flex justify-between mb-2.5">
            <div className="w-8 h-8 rounded-md bg-bg-subtle grid place-items-center text-fg-muted">
              <Icon name="cpu" size={16} />
            </div>
            <Dot
              status={
                d.device_status === "ONLINE"
                  ? "online"
                  : d.device_status === "OFFLINE"
                    ? "error"
                    : "warn"
              }
              live={d.device_status === "ONLINE"}
            />
          </div>
          <div className="font-semibold text-[13px] truncate">
            {d.device_name}
          </div>
          <div className="text-[11px] text-fg-muted mt-0.5 truncate">
            {d.template_name ?? "—"}
          </div>
          <div className="flex justify-between mt-2.5 text-[11px] text-fg-subtle">
            <span className="font-mono truncate">
              {d.device_id.slice(0, 8)}…
            </span>
            <span>{d.device_status}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

function SegmentedFilter({
  value,
  onChange,
  counts,
}: {
  value: Filter;
  onChange: (f: Filter) => void;
  counts: Record<Filter, number>;
}) {
  const items: { id: Filter; label: string }[] = [
    { id: "all", label: "Todos" },
    { id: "online", label: "Online" },
    { id: "offline", label: "Offline" },
  ];
  return (
    <div className="flex gap-0.5 p-0.5 bg-bg-subtle rounded-lg border border-border">
      {items.map((it) => {
        const active = value === it.id;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onChange(it.id)}
            className={cn(
              "px-2.5 py-[5px] text-[12px] rounded-md font-medium transition-colors",
              active
                ? "bg-bg-elev border border-border text-fg"
                : "text-fg-muted hover:text-fg",
            )}
          >
            {it.label}
            <span className="text-fg-subtle ml-1">{counts[it.id]}</span>
          </button>
        );
      })}
    </div>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: View;
  onChange: (v: View) => void;
}) {
  return (
    <div className="flex gap-0.5 p-0.5 bg-bg-subtle rounded-lg border border-border">
      {(["list", "grid"] as const).map((id) => {
        const active = id === view;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-label={id === "list" ? "Lista" : "Cartões"}
            className={cn(
              "w-7 h-[26px] grid place-items-center rounded transition-colors",
              active
                ? "bg-bg-elev border border-border text-fg"
                : "text-fg-muted hover:text-fg",
            )}
          >
            <Icon name={id} size={13} />
          </button>
        );
      })}
    </div>
  );
}
