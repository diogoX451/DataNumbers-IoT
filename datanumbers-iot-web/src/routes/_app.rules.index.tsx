import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk, queries } from "@/api/queries";
import { rulesService } from "@/api/services/rules";
import { PageHeader } from "@/components/PageHeader";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { Pill } from "@/components/ui/Pill";
import { Toggle } from "@/components/ui/Toggle";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { errorMessage, useToast } from "@/components/ui/Toast";

export const Route = createFileRoute("/_app/rules/")({
  component: RulesPage,
});

function RulesPage() {
  const rulesQ = useQuery(queries.rules());
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const toggleM = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      rulesService.update(id, { is_active: active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.rules() });
    },
    onError: (e) =>
      toast("Falha ao salvar", {
        description: errorMessage(e),
        variant: "error",
      }),
  });

  return (
    <PageShell
      crumbs={[
        { label: "Início", to: "/" },
        { label: "Automações" },
      ]}
    >
      <PageHeader
        title="Automações"
        subtitle="Regras SE/ENTÃO que reagem aos seus dispositivos"
        actions={
          <Button
            onClick={() =>
              navigate({ to: "/rules/$id", params: { id: "new" } })
            }
          >
            <Icon name="plus" size={14} /> Nova regra
          </Button>
        }
      />
      <Card noPadding>
        {rulesQ.isLoading ? (
          <LoadingState />
        ) : rulesQ.isError ? (
          <ErrorState
            description={errorMessage(rulesQ.error)}
            onRetry={() => rulesQ.refetch()}
          />
        ) : (rulesQ.data ?? []).length === 0 ? (
          <EmptyState
            icon="workflow"
            title="Nenhuma regra ainda"
            description="Regras avaliam telemetria em tempo real e disparam ações no atuador certo."
            action={
              <Button
                size="sm"
                onClick={() =>
                  navigate({ to: "/rules/$id", params: { id: "new" } })
                }
              >
                <Icon name="plus" size={12} /> Criar primeira regra
              </Button>
            }
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH className="w-12" />
                <TH>Nome</TH>
                <TH>Condição</TH>
                <TH>Status</TH>
                <TH className="w-10" />
              </tr>
            </THead>
            <TBody>
              {(rulesQ.data ?? []).map((r) => (
                <TR key={r.rule_id}>
                  <TD onClick={(e) => e.stopPropagation()}>
                    <Toggle
                      on={r.is_active}
                      onChange={(v) =>
                        toggleM.mutate({ id: r.rule_id, active: v })
                      }
                    />
                  </TD>
                  <TD
                    className="cursor-pointer"
                    onClick={() =>
                      navigate({ to: "/rules/$id", params: { id: r.rule_id } })
                    }
                  >
                    <div className="font-medium">{r.name}</div>
                    {r.description && (
                      <div className="text-[11px] text-fg-subtle truncate max-w-md">
                        {r.description}
                      </div>
                    )}
                  </TD>
                  <TD
                    className="cursor-pointer"
                    onClick={() =>
                      navigate({ to: "/rules/$id", params: { id: r.rule_id } })
                    }
                  >
                    <code className="bg-info-bg text-info px-1.5 py-0.5 rounded text-[11px]">
                      {r.trigger_condition}
                    </code>
                  </TD>
                  <TD>
                    <Pill tone={r.is_active ? "success" : "neutral"}>
                      {r.is_active ? "Ativa" : "Inativa"}
                    </Pill>
                  </TD>
                  <TD>
                    <Icon name="chevronRight" size={14} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </PageShell>
  );
}
