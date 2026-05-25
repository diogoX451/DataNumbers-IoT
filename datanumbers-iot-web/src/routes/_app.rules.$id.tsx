import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { qk, queries } from "@/api/queries";
import { actuatorsService } from "@/api/services/devices";
import { rulesService } from "@/api/services/rules";
import { PageHeader } from "@/components/PageHeader";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/Icon";
import { Hint, Input, Label, Select, Textarea } from "@/components/ui/Input";
import { Toggle } from "@/components/ui/Toggle";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { errorMessage, useToast } from "@/components/ui/Toast";
import type {
  Actuator,
  CreateActionPayload,
  CreateRulePayload,
  RuleAction,
  UpdateRulePayload,
} from "@/api/types";

export const Route = createFileRoute("/_app/rules/$id")({
  component: RuleBuilderPage,
});

function RuleBuilderPage() {
  const { id } = Route.useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const ruleQ = useQuery({
    ...queries.rule(id),
    enabled: !isNew,
  });
  const scenariosQ = useQuery(queries.scenarios());
  const actionsQ = useQuery({
    ...queries.ruleActions(id),
    enabled: !isNew,
  });

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scenarioId, setScenarioId] = useState("");
  const [variable, setVariable] = useState("temp");
  const [op, setOp] = useState(">");
  const [value, setValue] = useState("25");
  const [isActive, setIsActive] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!ruleQ.data) return;
    setName(ruleQ.data.name);
    setDescription(ruleQ.data.description);
    setScenarioId(ruleQ.data.scenario_id ?? "");
    setIsActive(ruleQ.data.is_active);
    const parsed = parseSimpleCondition(ruleQ.data.trigger_condition);
    if (parsed) {
      setVariable(parsed.variable);
      setOp(parsed.op);
      setValue(parsed.value);
    }
  }, [ruleQ.data]);

  const triggerCondition = useMemo(
    () => `${variable} ${op} ${value}`,
    [variable, op, value],
  );

  const createM = useMutation({
    mutationFn: (payload: CreateRulePayload) => rulesService.create(payload),
    onSuccess: (r) => {
      toast("Regra criada", { variant: "success" });
      queryClient.invalidateQueries({ queryKey: qk.rules() });
      navigate({ to: "/rules/$id", params: { id: r.rule_id } });
    },
    onError: (e) =>
      toast("Falha ao criar", {
        description: errorMessage(e),
        variant: "error",
      }),
  });

  const updateM = useMutation({
    mutationFn: (payload: UpdateRulePayload) =>
      rulesService.update(id, payload),
    onSuccess: () => {
      toast("Regra atualizada", { variant: "success" });
      queryClient.invalidateQueries({ queryKey: qk.rule(id) });
      queryClient.invalidateQueries({ queryKey: qk.rules() });
    },
    onError: (e) =>
      toast("Falha ao salvar", {
        description: errorMessage(e),
        variant: "error",
      }),
  });

  const deleteM = useMutation({
    mutationFn: () => rulesService.remove(id),
    onSuccess: () => {
      toast("Regra removida", { variant: "success" });
      queryClient.invalidateQueries({ queryKey: qk.rules() });
      navigate({ to: "/rules" });
    },
    onError: (e) =>
      toast("Falha", { description: errorMessage(e), variant: "error" }),
  });

  function save() {
    if (!name.trim() || !triggerCondition.trim()) return;
    const payload = {
      name: name.trim(),
      description: description.trim(),
      trigger_condition: triggerCondition,
      scenario_id: scenarioId || undefined,
    };
    if (isNew) {
      createM.mutate(payload);
    } else {
      updateM.mutate({ ...payload, is_active: isActive });
    }
  }

  if (!isNew && ruleQ.isLoading) {
    return (
      <PageShell
        crumbs={[
          { label: "Automações", to: "/rules" },
          { label: id },
        ]}
      >
        <LoadingState />
      </PageShell>
    );
  }

  if (!isNew && ruleQ.isError) {
    return (
      <PageShell
        crumbs={[
          { label: "Automações", to: "/rules" },
          { label: id },
        ]}
      >
        <ErrorState
          description={errorMessage(ruleQ.error)}
          onRetry={() => ruleQ.refetch()}
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      crumbs={[
        { label: "Início", to: "/" },
        { label: "Automações", to: "/rules" },
        { label: isNew ? "Nova regra" : ruleQ.data?.name ?? "Editar" },
      ]}
    >
      <PageHeader
        leading={
          <Button
            variant="ghost"
            size="sm"
            className="mb-1.5"
            onClick={() => navigate({ to: "/rules" })}
          >
            <Icon name="chevronLeft" size={13} /> Automações
          </Button>
        }
        title={isNew ? "Nova regra" : "Editar regra"}
        subtitle="Configure uma automação SE/ENTÃO."
        actions={
          <>
            {!isNew && (
              <Button variant="danger" onClick={() => setDeleting(true)}>
                <Icon name="trash" size={14} /> Apagar
              </Button>
            )}
            <Button
              onClick={save}
              disabled={createM.isPending || updateM.isPending}
            >
              <Icon name="check" size={14} />{" "}
              {createM.isPending || updateM.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-[1.5fr_1fr] gap-[18px]">
        <div className="flex flex-col gap-3.5">
          <Card>
            <CardBody>
              <div className="grid grid-cols-[1fr_auto] gap-3.5 items-end">
                <div>
                  <Label>Nome da regra</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex.: Irrigar quando solo seco"
                    autoFocus
                  />
                </div>
                {!isNew && (
                  <div className="flex items-center gap-2 pb-2">
                    <span className="text-[12px] text-fg-muted">
                      {isActive ? "Ativa" : "Inativa"}
                    </span>
                    <Toggle
                      on={isActive}
                      onChange={(v) => {
                        setIsActive(v);
                        updateM.mutate({ is_active: v });
                      }}
                    />
                  </div>
                )}
              </div>
              <div className="mt-3.5">
                <Label>Descrição</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="mt-3.5">
                <Label>Space (opcional)</Label>
                <Select
                  value={scenarioId}
                  onChange={(e) => setScenarioId(e.target.value)}
                >
                  <option value="">— Sem space —</option>
                  {(scenariosQ.data ?? []).map((s) => (
                    <option key={s.scenario_id} value={s.scenario_id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </div>
            </CardBody>
          </Card>

          <BuilderBlock variant="when">
            <RBRow>
              <RBToken>quando</RBToken>
              <Input
                value={variable}
                onChange={(e) => setVariable(e.target.value)}
                className="w-32 font-mono"
                placeholder="campo"
              />
              <Select
                value={op}
                onChange={(e) => setOp(e.target.value)}
                className="w-40"
              >
                <option value=">">{`>`} maior que</option>
                <option value="<">{`<`} menor que</option>
                <option value=">=">{`>=`} maior ou igual</option>
                <option value="<=">{`<=`} menor ou igual</option>
                <option value="==">{`==`} igual</option>
                <option value="!=">{`!=`} diferente</option>
              </Select>
              <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-24 font-mono"
              />
            </RBRow>
            <Hint>
              A condição é avaliada pelo rule-engine (govaluate) sobre o{" "}
              <code>payload</code> da telemetria.
            </Hint>
          </BuilderBlock>

          <div className="grid place-items-center py-1 text-fg-subtle">
            <Icon name="arrowDown" size={20} />
          </div>

          {isNew ? (
            <Card>
              <CardBody>
                <EmptyState
                  icon="info"
                  title="Salve a regra primeiro"
                  description="Depois de criar a regra, você pode adicionar ações (atuadores que serão disparados)."
                />
              </CardBody>
            </Card>
          ) : (
            <ActionsCard
              ruleId={id}
              actions={actionsQ.data ?? []}
              loading={actionsQ.isLoading}
            />
          )}
        </div>

        <div className="flex flex-col gap-3.5">
          <Card>
            <CardHeader title="Pré-visualização" />
            <CardBody>
              <div className="bg-bg-subtle rounded p-3.5 font-mono text-[12px] leading-relaxed">
                <span className="text-info">WHEN</span>{" "}
                <code className="text-fg">{triggerCondition || "—"}</code>
                <br />
                <span className="text-accent">THEN</span> dispara ações via{" "}
                <code className="text-fg">iot.command.send</code>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Como funciona" />
            <CardBody className="text-[12px] text-fg-muted leading-relaxed flex flex-col gap-2">
              <p>
                O <b>rule-engine</b> consome cada telemetria publicada em{" "}
                <code className="font-mono text-fg">
                  iot.telemetry.received
                </code>{" "}
                e avalia a condição contra o <code>payload</code> da mensagem.
              </p>
              <p>
                Quando ela passa, ele interpola o <code>payload_template</code>{" "}
                (substitui <code>{"${payload.x}"}</code> pelos valores reais) e
                publica em <code>iot.command.send</code>, que o gateway-emqx
                encaminha para o tópico MQTT do atuador.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={deleting}
        title="Apagar regra?"
        description="A regra e todas as suas ações serão removidas."
        destructive
        confirmLabel="Apagar"
        onCancel={() => setDeleting(false)}
        onConfirm={() => deleteM.mutate()}
        loading={deleteM.isPending}
      />
    </PageShell>
  );
}

function BuilderBlock({
  variant,
  children,
}: {
  variant: "when" | "then";
  children: React.ReactNode;
}) {
  const isWhen = variant === "when";
  return (
    <div className="border border-border rounded-lg bg-bg-elev p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <span
          className={
            isWhen
              ? "text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-info-bg text-info"
              : "text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-accent-bg text-accent"
          }
        >
          <Icon name={isWhen ? "info" : "zap"} size={10} className="inline" />{" "}
          {isWhen ? "Quando" : "Então"}
        </span>
        <span className="text-[12px] text-fg-muted">
          {isWhen ? "esta condição for verdadeira" : "execute esta(s) ação(ões)"}
        </span>
      </div>
      {children}
    </div>
  );
}

function RBRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 items-center p-2.5 bg-bg-subtle rounded border border-border">
      {children}
    </div>
  );
}

function RBToken({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-2 py-1 rounded text-[12px] font-medium bg-bg-elev border border-border-strong">
      {children}
    </span>
  );
}

// -----------------------------------------------------------------------------
// Actions — CRUD inline
// -----------------------------------------------------------------------------

function ActionsCard({
  ruleId,
  actions,
  loading,
}: {
  ruleId: string;
  actions: RuleAction[];
  loading: boolean;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const removeM = useMutation({
    mutationFn: (actionId: string) =>
      rulesService.removeAction(ruleId, actionId),
    onSuccess: () => {
      toast("Ação removida", { variant: "success" });
      queryClient.invalidateQueries({ queryKey: qk.ruleActions(ruleId) });
      setDeletingId(null);
    },
    onError: (e) =>
      toast("Falha", { description: errorMessage(e), variant: "error" }),
  });

  return (
    <BuilderBlock variant="then">
      {loading ? (
        <LoadingState />
      ) : actions.length === 0 ? (
        <EmptyState
          icon="zap"
          title="Sem ações"
          description="Adicione um atuador pra ser disparado quando a condição for verdadeira."
          action={
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Icon name="plus" size={12} /> Adicionar ação
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {actions.map((a) => (
            <div
              key={a.action_id}
              className="flex items-center gap-2 p-2.5 bg-bg-subtle rounded border border-border"
            >
              <div className="w-8 h-8 rounded bg-accent-bg text-accent grid place-items-center shrink-0">
                <Icon name="bolt" size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-medium truncate">
                  {a.command_topic ?? a.actuator_id.slice(0, 8) + "…"}
                </div>
                <div className="font-mono text-[11px] text-fg-subtle truncate">
                  {a.payload_template}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeletingId(a.action_id)}
                className="w-7 h-7 grid place-items-center rounded text-fg-muted hover:bg-danger-bg hover:text-danger"
                aria-label="Remover ação"
              >
                <Icon name="trash" size={13} />
              </button>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAddOpen(true)}
          >
            <Icon name="plus" size={12} /> Adicionar outra ação
          </Button>
        </div>
      )}

      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Adicionar ação"
        description="Escolha um atuador e o payload que será enviado quando a condição disparar."
      >
        <AddActionForm ruleId={ruleId} onDone={() => setAddOpen(false)} />
      </Dialog>

      <ConfirmDialog
        open={!!deletingId}
        title="Remover ação?"
        description="A ação será apagada. A regra continua existindo."
        destructive
        confirmLabel="Remover"
        onCancel={() => setDeletingId(null)}
        onConfirm={() => deletingId && removeM.mutate(deletingId)}
        loading={removeM.isPending}
      />
    </BuilderBlock>
  );
}

function AddActionForm({
  ruleId,
  onDone,
}: {
  ruleId: string;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const devicesQ = useQuery(queries.devices());
  const [deviceId, setDeviceId] = useState("");
  const [actuatorId, setActuatorId] = useState("");
  const [payloadTemplate, setPayloadTemplate] = useState(
    '{ "open": true, "duration_s": 300 }',
  );

  const actuatorsQ = useQuery({
    queryKey: ["actuators", deviceId],
    queryFn: () => actuatorsService.list(deviceId),
    enabled: !!deviceId,
  });

  const createM = useMutation({
    mutationFn: (payload: CreateActionPayload) =>
      rulesService.createAction(ruleId, payload),
    onSuccess: () => {
      toast("Ação adicionada", { variant: "success" });
      queryClient.invalidateQueries({ queryKey: qk.ruleActions(ruleId) });
      onDone();
    },
    onError: (e) =>
      toast("Falha", { description: errorMessage(e), variant: "error" }),
  });

  const devices = devicesQ.data ?? [];
  const actuators = actuatorsQ.data ?? [];

  const disabled = !actuatorId || !payloadTemplate.trim() || createM.isPending;

  useEffect(() => {
    if (!deviceId && devices.length > 0) setDeviceId(devices[0].device_id);
  }, [devices, deviceId]);
  useEffect(() => {
    if (actuators.length === 0) {
      setActuatorId("");
      return;
    }
    if (!actuators.some((a) => a.actuator_id === actuatorId)) {
      setActuatorId(actuators[0].actuator_id);
    }
  }, [actuators, actuatorId]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (disabled) return;
    createM.mutate({
      actuator_id: actuatorId,
      payload_template: payloadTemplate,
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3.5">
      <div>
        <Label>Dispositivo</Label>
        <Select value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
          {devices.length === 0 && <option value="">Sem devices</option>}
          {devices.map((d) => (
            <option key={d.device_id} value={d.device_id}>
              {d.device_name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Atuador</Label>
        {actuatorsQ.isLoading ? (
          <div className="text-[12px] text-fg-muted py-2">Carregando…</div>
        ) : actuators.length === 0 ? (
          <div className="text-[12px] text-warn py-2">
            Esse dispositivo não tem atuadores. Cadastre um na página do device.
          </div>
        ) : (
          <Select
            value={actuatorId}
            onChange={(e) => setActuatorId(e.target.value)}
          >
            {actuators.map((a: Actuator) => (
              <option key={a.actuator_id} value={a.actuator_id}>
                {a.name} — {a.command_topic}
              </option>
            ))}
          </Select>
        )}
      </div>
      <div>
        <Label>Payload template</Label>
        <Textarea
          value={payloadTemplate}
          onChange={(e) => setPayloadTemplate(e.target.value)}
          rows={4}
          className="font-mono text-[12px]"
        />
        <Hint>
          Pode usar placeholders <code>${"{payload.temperatura}"}</code> que o
          rule-engine interpola com o valor da telemetria recebida.
        </Hint>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={disabled}>
          {createM.isPending ? "Adicionando…" : "Adicionar"}
        </Button>
      </div>
    </form>
  );
}

function parseSimpleCondition(
  cond: string,
): { variable: string; op: string; value: string } | null {
  const m = cond.trim().match(/^(\S+)\s+(>=|<=|==|!=|>|<)\s+(.+)$/);
  if (!m) return null;
  return { variable: m[1], op: m[2], value: m[3].trim() };
}
