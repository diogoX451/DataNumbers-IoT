import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { qk, queries } from "@/api/queries";
import { scenariosService } from "@/api/services/rules";
import { PageHeader } from "@/components/PageHeader";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Dialog } from "@/components/ui/Dialog";
import { Dot } from "@/components/ui/Dot";
import { Icon } from "@/components/Icon";
import { Pill } from "@/components/ui/Pill";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/EmptyState";
import { Select } from "@/components/ui/Input";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { errorMessage, useToast } from "@/components/ui/Toast";
import { colorForSpace } from "./_app.index";
import { ScenarioForm } from "./_app.spaces.index";

export const Route = createFileRoute("/_app/spaces/$id")({
  component: SpaceDetailPage,
});

const TABS = [
  { id: "devices", label: "Dispositivos" },
  { id: "rules", label: "Regras" },
] as const;
type TabId = (typeof TABS)[number]["id"];

function SpaceDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const spacesQ = useQuery(queries.scenarios());
  const linkedQ = useQuery(queries.scenarioDevices(id));
  const rulesQ = useQuery(queries.rules(id));
  const allDevicesQ = useQuery(queries.devices());

  const space = (spacesQ.data ?? []).find((s) => s.scenario_id === id);

  const [tab, setTab] = useState<TabId>("devices");
  const [editing, setEditing] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const updateM = useMutation({
    mutationFn: (payload: { name: string; description?: string }) =>
      scenariosService.update(id, payload),
    onSuccess: () => {
      toast("Space atualizado", { variant: "success" });
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: qk.scenarios() });
    },
    onError: (e) =>
      toast("Falha", { description: errorMessage(e), variant: "error" }),
  });

  const deleteM = useMutation({
    mutationFn: () => scenariosService.remove(id),
    onSuccess: () => {
      toast("Space removido", { variant: "success" });
      queryClient.invalidateQueries({ queryKey: qk.scenarios() });
      navigate({ to: "/spaces" });
    },
    onError: (e) =>
      toast("Falha", { description: errorMessage(e), variant: "error" }),
  });

  const linkM = useMutation({
    mutationFn: (deviceId: string) => scenariosService.linkDevice(id, deviceId),
    onSuccess: () => {
      toast("Dispositivo vinculado", { variant: "success" });
      queryClient.invalidateQueries({ queryKey: qk.scenarioDevices(id) });
    },
    onError: (e) =>
      toast("Falha", { description: errorMessage(e), variant: "error" }),
  });

  const unlinkM = useMutation({
    mutationFn: (deviceId: string) =>
      scenariosService.unlinkDevice(id, deviceId),
    onSuccess: () => {
      toast("Dispositivo removido", { variant: "success" });
      queryClient.invalidateQueries({ queryKey: qk.scenarioDevices(id) });
    },
    onError: (e) =>
      toast("Falha", { description: errorMessage(e), variant: "error" }),
  });

  if (spacesQ.isLoading) {
    return (
      <PageShell crumbs={[{ label: "Spaces", to: "/spaces" }, { label: id }]}>
        <LoadingState />
      </PageShell>
    );
  }

  if (!space) {
    return (
      <PageShell crumbs={[{ label: "Spaces", to: "/spaces" }, { label: id }]}>
        <ErrorState title="Space não encontrado" />
      </PageShell>
    );
  }

  const linkedIds = new Set((linkedQ.data ?? []).map((d) => d.device_id));
  const available = (allDevicesQ.data ?? []).filter(
    (d) => !linkedIds.has(d.device_id),
  );

  return (
    <PageShell
      crumbs={[
        { label: "Início", to: "/" },
        { label: "Spaces", to: "/spaces" },
        { label: space.name },
      ]}
    >
      <PageHeader
        leading={
          <Button
            variant="ghost"
            size="sm"
            className="mb-1.5"
            onClick={() => navigate({ to: "/spaces" })}
          >
            <Icon name="chevronLeft" size={13} /> Spaces
          </Button>
        }
        title={
          <span className="flex items-center gap-3">
            <span
              className="w-9 h-9 rounded-lg grid place-items-center text-white"
              style={{ background: colorForSpace(space.scenario_id) }}
            >
              <Icon name="folder" size={18} />
            </span>
            <span>{space.name}</span>
          </span>
        }
        subtitle={space.description || "Sem descrição"}
        actions={
          <>
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <Icon name="edit" size={14} /> Editar
            </Button>
            <Button variant="danger" onClick={() => setDeleting(true)}>
              <Icon name="trash" size={14} /> Apagar
            </Button>
          </>
        }
      />

      <Tabs
        items={TABS.map((t) => ({
          ...t,
          label:
            t.id === "devices"
              ? `Dispositivos (${linkedQ.data?.length ?? 0})`
              : `Regras (${rulesQ.data?.length ?? 0})`,
        }))}
        active={tab}
        onChange={setTab}
      />

      {tab === "devices" && (
        <Card noPadding>
          <CardHeader
            title="Dispositivos vinculados"
            action={
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setLinkOpen(true)}
                disabled={available.length === 0}
              >
                <Icon name="plus" size={12} /> Vincular
              </Button>
            }
          />
          {linkedQ.isLoading ? (
            <LoadingState />
          ) : (linkedQ.data ?? []).length === 0 ? (
            <EmptyState
              icon="cpu"
              title="Nenhum dispositivo aqui"
              description="Vincule devices pra que as regras desse space possam atuar sobre eles."
              action={
                available.length > 0 ? (
                  <Button size="sm" onClick={() => setLinkOpen(true)}>
                    <Icon name="plus" size={12} /> Vincular dispositivo
                  </Button>
                ) : null
              }
            />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Dispositivo</TH>
                  <TH>Tópico</TH>
                  <TH className="w-20" />
                </tr>
              </THead>
              <TBody>
                {(linkedQ.data ?? []).map((d) => (
                  <TR key={d.device_id}>
                    <TD>
                      <div className="font-medium">{d.name}</div>
                      <div className="text-[11px] text-fg-subtle font-mono">
                        {d.device_id.slice(0, 8)}…
                      </div>
                    </TD>
                    <TD>
                      <code className="text-[11px] text-fg-muted">{d.topic}</code>
                    </TD>
                    <TD>
                      <button
                        type="button"
                        onClick={() => unlinkM.mutate(d.device_id)}
                        className="w-7 h-7 grid place-items-center rounded text-fg-muted hover:bg-danger-bg hover:text-danger"
                        aria-label="Desvincular"
                      >
                        <Icon name="x" size={13} />
                      </button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      )}

      {tab === "rules" && (
        <Card noPadding>
          <CardHeader
            title="Regras"
            action={
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  navigate({
                    to: "/rules/$id",
                    params: { id: "new" },
                  })
                }
              >
                <Icon name="plus" size={12} /> Nova regra
              </Button>
            }
          />
          {rulesQ.isLoading ? (
            <LoadingState />
          ) : (rulesQ.data ?? []).length === 0 ? (
            <EmptyState
              icon="workflow"
              title="Sem regras nesse space"
              description="Crie uma regra ligada a esse space pra reagir à telemetria dos seus devices."
            />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH className="w-9" />
                  <TH>Nome</TH>
                  <TH>Condição</TH>
                  <TH className="w-20" />
                </tr>
              </THead>
              <TBody>
                {(rulesQ.data ?? []).map((r) => (
                  <TR
                    key={r.rule_id}
                    clickable
                    onClick={() =>
                      navigate({
                        to: "/rules/$id",
                        params: { id: r.rule_id },
                      })
                    }
                  >
                    <TD>
                      <Dot status={r.is_active ? "online" : "neutral"} />
                    </TD>
                    <TD className="font-medium">{r.name}</TD>
                    <TD>
                      <code className="bg-info-bg text-info px-1.5 py-0.5 rounded text-[11px]">
                        {r.trigger_condition}
                      </code>
                    </TD>
                    <TD>
                      <Pill tone={r.is_active ? "success" : "neutral"}>
                        {r.is_active ? "Ativa" : "Inativa"}
                      </Pill>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      )}

      <Dialog
        open={editing}
        onClose={() => setEditing(false)}
        title="Editar space"
      >
        <ScenarioForm
          initial={{ name: space.name, description: space.description }}
          onSubmit={(v) => updateM.mutate(v)}
          onCancel={() => setEditing(false)}
          submitLabel="Salvar alterações"
          pending={updateM.isPending}
        />
      </Dialog>

      <Dialog
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        title="Vincular dispositivo"
        description="Adicione devices ao space pra que regras possam atuar sobre eles."
      >
        <LinkDevicePicker
          devices={available}
          onPick={(deviceId) => {
            linkM.mutate(deviceId);
            setLinkOpen(false);
          }}
          onCancel={() => setLinkOpen(false)}
        />
      </Dialog>

      <ConfirmDialog
        open={deleting}
        title="Apagar space?"
        description={`"${space.name}" será removido. Regras e dispositivos vinculados continuam, mas perdem a associação com esse space.`}
        destructive
        confirmLabel="Apagar"
        onCancel={() => setDeleting(false)}
        onConfirm={() => deleteM.mutate()}
        loading={deleteM.isPending}
      />
    </PageShell>
  );
}

function LinkDevicePicker({
  devices,
  onPick,
  onCancel,
}: {
  devices: { device_id: string; device_name: string; template_name?: string }[];
  onPick: (id: string) => void;
  onCancel: () => void;
}) {
  const [pick, setPick] = useState(devices[0]?.device_id ?? "");
  return (
    <div className="flex flex-col gap-3.5">
      {devices.length === 0 ? (
        <EmptyState
          icon="info"
          title="Não há dispositivos disponíveis"
          description="Todos os seus devices já estão neste space."
        />
      ) : (
        <Select value={pick} onChange={(e) => setPick(e.target.value)}>
          {devices.map((d) => (
            <option key={d.device_id} value={d.device_id}>
              {d.device_name}
              {d.template_name ? ` — ${d.template_name}` : ""}
            </option>
          ))}
        </Select>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={() => pick && onPick(pick)} disabled={!pick}>
          Vincular
        </Button>
      </div>
    </div>
  );
}
