import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { qk, queries } from "@/api/queries";
import { templatesService } from "@/api/services/templates";
import { PageHeader } from "@/components/PageHeader";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { TemplateForm } from "@/components/forms/TemplateForm";
import { errorMessage, useToast } from "@/components/ui/Toast";
import type { CreateTemplatePayload, Template } from "@/api/types";

export const Route = createFileRoute("/_app/templates")({
  component: TemplatesPage,
});

function TemplatesPage() {
  const { data: templates, isLoading, error, refetch } = useQuery(
    queries.templates(),
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [deleting, setDeleting] = useState<Template | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: qk.templates() });

  const createM = useMutation({
    mutationFn: (payload: CreateTemplatePayload) =>
      templatesService.create(payload),
    onSuccess: () => {
      toast("Template criado", { variant: "success" });
      setCreateOpen(false);
      invalidate();
    },
    onError: (e) =>
      toast("Falha ao criar template", {
        description: errorMessage(e),
        variant: "error",
      }),
  });

  const updateM = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: CreateTemplatePayload;
    }) => templatesService.update(id, payload),
    onSuccess: (_d, vars) => {
      toast("Template atualizado", { variant: "success" });
      setEditing(null);
      invalidate();
      queryClient.invalidateQueries({ queryKey: qk.template(vars.id) });
    },
    onError: (e) =>
      toast("Falha ao atualizar", {
        description: errorMessage(e),
        variant: "error",
      }),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => templatesService.remove(id),
    onSuccess: () => {
      toast("Template removido", { variant: "success" });
      setDeleting(null);
      invalidate();
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
        { label: "Templates" },
      ]}
    >
      <PageHeader
        title="Templates"
        subtitle="Modelos reutilizáveis que definem o schema dos dados de cada tipo de hardware"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Icon name="plus" size={14} /> Novo template
          </Button>
        }
      />

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState
          description={errorMessage(error)}
          onRetry={() => refetch()}
        />
      ) : !templates || templates.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon="layers"
              title="Você ainda não tem templates"
              description="Templates definem quais campos cada dispositivo manda (ex.: temp e umidade)."
              action={
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Icon name="plus" size={12} /> Criar primeiro template
                </Button>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3.5">
          {templates.map((t) => (
            <TemplateCard
              key={t.template_id}
              template={t}
              onEdit={() => setEditing(t)}
              onDelete={() => setDeleting(t)}
            />
          ))}
        </div>
      )}

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Novo template"
        description="Defina o schema dos dados que esses dispositivos vão mandar."
        size="lg"
      >
        <TemplateForm
          onSubmit={(value) => createM.mutate(value)}
          onCancel={() => setCreateOpen(false)}
          pending={createM.isPending}
        />
      </Dialog>

      <EditTemplateDialog
        template={editing}
        onClose={() => setEditing(null)}
        onSubmit={(value) =>
          editing &&
          updateM.mutate({ id: editing.template_id, payload: value })
        }
        pending={updateM.isPending}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Apagar template?"
        description={
          deleting
            ? `O template "${deleting.name}" será removido permanentemente.`
            : ""
        }
        destructive
        confirmLabel="Apagar"
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && deleteM.mutate(deleting.template_id)}
        loading={deleteM.isPending}
      />
    </PageShell>
  );
}

function TemplateCard({
  template,
  onEdit,
  onDelete,
}: {
  template: Template;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { data: full } = useQuery({
    ...queries.template(template.template_id),
    staleTime: 60_000,
  });
  const fields = full?.fields ?? [];

  return (
    <Card>
      <CardBody className="p-[18px]">
        <div className="flex items-start justify-between mb-2.5">
          <div className="flex gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-accent-bg text-accent grid place-items-center shrink-0">
              <Icon name="layers" size={16} />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate">
                {template.name}
              </div>
              <div className="text-[12px] text-fg-muted mt-0.5 line-clamp-2">
                {template.description || "Sem descrição"}
              </div>
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <button
              type="button"
              onClick={onEdit}
              className="w-7 h-7 grid place-items-center rounded text-fg-muted hover:bg-bg-hover hover:text-fg"
              aria-label="Editar"
            >
              <Icon name="edit" size={13} />
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
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3.5 min-h-[28px]">
          {fields.length === 0 ? (
            <span className="text-[11px] text-fg-subtle">
              Sem campos definidos
            </span>
          ) : (
            fields.map((f, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-bg-subtle border border-border text-[12px]"
              >
                <Icon name="gauge" size={11} />
                <b>{f.name}</b>
                <code className="text-[11px] text-fg-muted">{f.type}</code>
                {f.required && (
                  <span className="text-[10px] text-warn">obrigatório</span>
                )}
              </span>
            ))
          )}
        </div>
        <div className="flex justify-between items-center mt-3.5 pt-3.5 border-t border-border text-[12px] text-fg-muted">
          <span className="font-mono text-[11px]">
            {template.template_id.slice(0, 8)}…
          </span>
        </div>
      </CardBody>
    </Card>
  );
}

function EditTemplateDialog({
  template,
  onClose,
  onSubmit,
  pending,
}: {
  template: Template | null;
  onClose: () => void;
  onSubmit: (value: CreateTemplatePayload) => void;
  pending: boolean;
}) {
  const { data: full } = useQuery({
    ...queries.template(template?.template_id ?? ""),
    enabled: !!template,
  });
  return (
    <Dialog
      open={!!template}
      onClose={onClose}
      title="Editar template"
      description="Alterações afetam novos dispositivos."
      size="lg"
    >
      {template && (
        <TemplateForm
          initial={full ?? template}
          onSubmit={onSubmit}
          onCancel={onClose}
          submitLabel="Salvar alterações"
          pending={pending}
        />
      )}
    </Dialog>
  );
}
