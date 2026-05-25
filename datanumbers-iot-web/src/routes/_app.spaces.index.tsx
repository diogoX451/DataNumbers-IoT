import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { qk, queries } from "@/api/queries";
import { scenariosService } from "@/api/services/rules";
import { PageHeader } from "@/components/PageHeader";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/Icon";
import { EmptyState } from "@/components/EmptyState";
import { Input, Label } from "@/components/ui/Input";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { errorMessage, useToast } from "@/components/ui/Toast";
import { colorForSpace } from "./_app.index";
import type { CreateScenarioPayload } from "@/api/types";

export const Route = createFileRoute("/_app/spaces/")({
  component: SpacesPage,
});

function SpacesPage() {
  const spacesQ = useQuery(queries.scenarios());
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);

  const createM = useMutation({
    mutationFn: (payload: CreateScenarioPayload) =>
      scenariosService.create(payload),
    onSuccess: () => {
      toast("Space criado", { variant: "success" });
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: qk.scenarios() });
    },
    onError: (e) =>
      toast("Falha ao criar", {
        description: errorMessage(e),
        variant: "error",
      }),
  });

  return (
    <PageShell
      crumbs={[
        { label: "Início", to: "/" },
        { label: "Spaces" },
      ]}
    >
      <PageHeader
        title="Spaces"
        subtitle="Ambientes lógicos que agrupam dispositivos e suas automações"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Icon name="plus" size={14} /> Novo space
          </Button>
        }
      />
      {spacesQ.isLoading ? (
        <LoadingState />
      ) : spacesQ.isError ? (
        <ErrorState
          description={errorMessage(spacesQ.error)}
          onRetry={() => spacesQ.refetch()}
        />
      ) : (spacesQ.data ?? []).length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon="folder"
              title="Nenhum space ainda"
              description="Spaces agrupam devices por contexto físico (estufa, pomar, etc.) e servem de filtro pra regras."
              action={
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Icon name="plus" size={12} /> Criar primeiro space
                </Button>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-3.5">
          {(spacesQ.data ?? []).map((s) => (
            <Link
              key={s.scenario_id}
              to="/spaces/$id"
              params={{ id: s.scenario_id }}
            >
              <Card className="cursor-pointer hover:shadow transition-shadow">
                <div
                  className="h-20 relative"
                  style={{
                    background: `linear-gradient(135deg, ${colorForSpace(s.scenario_id)}, color-mix(in oklch, ${colorForSpace(s.scenario_id)} 50%, var(--bg)))`,
                  }}
                >
                  <div className="absolute top-3.5 left-4 text-white">
                    <Icon name="folder" size={20} />
                  </div>
                </div>
                <CardBody className="p-4">
                  <div className="font-semibold text-[15px]">{s.name}</div>
                  <div className="text-[12px] text-fg-muted mt-0.5 line-clamp-2 min-h-[2.4em]">
                    {s.description || "Sem descrição"}
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Novo space"
      >
        <ScenarioForm
          onSubmit={(v) => createM.mutate(v)}
          onCancel={() => setCreateOpen(false)}
          pending={createM.isPending}
        />
      </Dialog>
    </PageShell>
  );
}

export function ScenarioForm({
  onSubmit,
  onCancel,
  pending,
  initial,
  submitLabel = "Criar",
}: {
  onSubmit: (v: CreateScenarioPayload) => void;
  onCancel: () => void;
  pending: boolean;
  initial?: CreateScenarioPayload;
  submitLabel?: string;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const disabled = !name.trim() || pending;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (disabled) return;
        onSubmit({
          name: name.trim(),
          description: description.trim() || undefined,
        });
      }}
      className="flex flex-col gap-3.5"
    >
      <div>
        <Label>Nome</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          required
        />
      </div>
      <div>
        <Label>Descrição</Label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={pending}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={disabled}>
          {pending ? "Salvando…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
