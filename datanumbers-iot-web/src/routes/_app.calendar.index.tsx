import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { qk, queries } from "@/api/queries";
import {
  calendarService,
  googleCalendarAuthService,
} from "@/api/services/calendar";
import type { CreateCalendarEventPayload } from "@/api/types";
import { PageHeader } from "@/components/PageHeader";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { Hint, Input, Label, Select, Textarea } from "@/components/ui/Input";
import { Pill } from "@/components/ui/Pill";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { errorMessage, useToast } from "@/components/ui/Toast";

export const Route = createFileRoute("/_app/calendar/")({
  component: CalendarPage,
});

// toLocalInputValue/fromLocalInputValue convertem entre o formato de
// <input type="datetime-local"> (sem timezone) e RFC3339 (com timezone),
// que é o que o calendar-tool espera.
function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultStart(): string {
  const d = new Date(Date.now() + 5 * 60_000);
  return toLocalInputValue(d);
}

function defaultEnd(): string {
  const d = new Date(Date.now() + 65 * 60_000);
  return toLocalInputValue(d);
}

function CalendarPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const eventsQ = useQuery(queries.calendarEvents());
  const scenariosQ = useQuery(queries.scenarios());
  const googleStatusQ = useQuery({
    queryKey: ["google-calendar-status"],
    queryFn: () => googleCalendarAuthService.status(),
  });

  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [scenarioId, setScenarioId] = useState("");
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);

  const createM = useMutation({
    mutationFn: (payload: CreateCalendarEventPayload) =>
      calendarService.create(payload),
    onSuccess: (event) => {
      toast(
        event.synced_to_google
          ? "Evento marcado, sincronizado no Google e automação disparada"
          : "Evento marcado localmente — automação disparada",
        { variant: "success" },
      );
      queryClient.invalidateQueries({ queryKey: qk.calendarEvents() });
      setSummary("");
      setDescription("");
    },
    onError: (e) =>
      toast("Falha ao marcar evento", {
        description: errorMessage(e),
        variant: "error",
      }),
  });

  const removeM = useMutation({
    mutationFn: (id: string) => calendarService.remove(id),
    onSuccess: () => {
      toast("Evento removido", { variant: "success" });
      queryClient.invalidateQueries({ queryKey: qk.calendarEvents() });
    },
    onError: (e) =>
      toast("Falha ao remover", {
        description: errorMessage(e),
        variant: "error",
      }),
  });

  function create() {
    if (!summary.trim() || !start || !end) return;
    createM.mutate({
      summary: summary.trim(),
      description: description.trim() || undefined,
      scenario_id: scenarioId || undefined,
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
    });
  }

  const googleConfigured = googleStatusQ.data?.configured ?? true;
  const googleConnected = googleStatusQ.data?.connected ?? false;
  const invalidRange =
    Boolean(start && end) && new Date(end).getTime() <= new Date(start).getTime();

  return (
    <PageShell crumbs={[{ label: "Início", to: "/" }, { label: "Calendário" }]}>
      <PageHeader
        title="Calendário"
        subtitle="Marque um evento — ele dispara automation.rules amarradas a ele (ver Automações)"
      />

      <div className="grid grid-cols-[1fr_1.5fr] gap-[18px]">
        <Card>
          <CardHeader
            title="Marcar evento"
            action={
              googleStatusQ.isLoading ? (
                <Pill>Verificando Google</Pill>
              ) : googleConnected ? (
                <Pill tone="success">Google conectado</Pill>
              ) : googleConfigured ? (
                <Pill tone="warn">Google desconectado</Pill>
              ) : (
                <Pill tone="danger">Google sem credenciais</Pill>
              )
            }
          />
          <CardBody className="flex flex-col gap-3">
            <div className="text-[12px] text-fg-muted">
              {googleConnected
                ? "Novos eventos também serão criados no Google Calendar."
                : googleConfigured
                  ? "Novos eventos ficam internos até conectar o Google Calendar em Configurações."
                  : "Configure GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no backend para habilitar o Google Calendar."}
            </div>
            <div>
              <Label>Título</Label>
              <Input
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Ex.: Regar plantas"
                autoFocus
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Início</Label>
                <Input
                  type="datetime-local"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </div>
              <div>
                <Label>Fim</Label>
                <Input
                  type="datetime-local"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Space (opcional)</Label>
              <Select
                value={scenarioId}
                onChange={(e) => setScenarioId(e.target.value)}
              >
                <option value="">Nenhum</option>
                {(scenariosQ.data ?? []).map((s) => (
                  <option key={s.scenario_id} value={s.scenario_id}>
                    {s.name}
                  </option>
                ))}
              </Select>
              <Hint>
                Vincule a um space pra referenciar seus dispositivos na regra
                de automação (${"{payload.scenario_id}"}).
              </Hint>
            </div>
            <Button
              onClick={create}
              disabled={createM.isPending || !summary.trim() || invalidRange}
            >
              <Icon name="plus" size={14} />{" "}
              {createM.isPending ? "Marcando…" : "Marcar evento"}
            </Button>
          </CardBody>
        </Card>

        <Card noPadding>
          {eventsQ.isLoading ? (
            <LoadingState />
          ) : eventsQ.isError ? (
            <ErrorState
              description={errorMessage(eventsQ.error)}
              onRetry={() => eventsQ.refetch()}
            />
          ) : (eventsQ.data ?? []).length === 0 ? (
            <EmptyState
              icon="calendar"
              title="Nenhum evento marcado"
              description="Eventos marcados aqui disparam automation.rules na hora, do mesmo jeito que telemetria de sensor."
            />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Evento</TH>
                  <TH>Início</TH>
                  <TH>Fim</TH>
                  <TH>Google</TH>
                  <TH className="w-10" />
                </tr>
              </THead>
              <TBody>
                {(eventsQ.data ?? []).map((ev) => (
                  <TR key={ev.event_id}>
                    <TD>
                      <div className="font-medium">{ev.summary}</div>
                      {ev.description && (
                        <div className="text-[11px] text-fg-subtle truncate max-w-xs">
                          {ev.description}
                        </div>
                      )}
                    </TD>
                    <TD>{new Date(ev.start).toLocaleString()}</TD>
                    <TD>{new Date(ev.end).toLocaleString()}</TD>
                    <TD>
                      {ev.synced_to_google ? (
                        <Pill tone="success">Sincronizado</Pill>
                      ) : (
                        <Pill>Local</Pill>
                      )}
                    </TD>
                    <TD onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeM.mutate(ev.event_id)}
                        disabled={removeM.isPending}
                      >
                        <Icon name="trash" size={13} />
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
