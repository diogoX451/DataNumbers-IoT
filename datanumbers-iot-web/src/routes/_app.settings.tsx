import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { qk, queries } from "@/api/queries";
import { authService } from "@/api/services/auth";
import { googleCalendarAuthService } from "@/api/services/calendar";
import { PageHeader } from "@/components/PageHeader";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/Icon";
import { Input, Label, Select } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import { KV } from "@/components/KV";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/ui/States";
import { useTheme } from "@/lib/theme";
import { clearTokens } from "@/lib/auth";
import { errorMessage, useToast } from "@/components/ui/Toast";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

const TABS = [
  { id: "profile", label: "Perfil" },
  { id: "appearance", label: "Aparência" },
  { id: "api", label: "API & MQTT" },
  { id: "integrations", label: "Integrações" },
  { id: "session", label: "Sessão" },
] as const;
type TabId = (typeof TABS)[number]["id"];

function SettingsPage() {
  const [tab, setTab] = useState<TabId>("profile");
  const { toast } = useToast();

  // O calendar-tool redireciona de volta pra cá com ?google=connected|error
  // depois do consent screen do Google (ver AuthHandler.Callback no backend).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const google = params.get("google");
    if (!google) return;
    setTab("integrations");
    if (google === "connected") {
      toast("Google Calendar conectado", { variant: "success" });
    } else if (google === "error") {
      toast("Falha ao conectar Google Calendar", { variant: "error" });
    }
    window.history.replaceState(null, "", window.location.pathname);
  }, [toast]);

  return (
    <PageShell
      crumbs={[
        { label: "Início", to: "/" },
        { label: "Configurações" },
      ]}
    >
      <PageHeader
        title="Configurações"
        subtitle="Gerencie sua conta, workspace e preferências"
      />
      <Tabs items={TABS} active={tab} onChange={setTab} />

      {tab === "profile" && <ProfileTab />}
      {tab === "appearance" && <AppearanceTab />}
      {tab === "api" && <ApiTab />}
      {tab === "integrations" && <IntegrationsTab />}
      {tab === "session" && <SessionTab />}
    </PageShell>
  );
}

function ProfileTab() {
  const { data: me, isLoading } = useQuery(queries.me());
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (me) {
      setName(me.Name);
      setEmail(me.Email);
    }
  }, [me]);

  const updateM = useMutation({
    mutationFn: () => authService.updateProfile({ name, email }),
    onSuccess: () => {
      toast("Perfil atualizado", { variant: "success" });
      queryClient.invalidateQueries({ queryKey: qk.me() });
    },
    onError: (e) =>
      toast("Falha ao atualizar", {
        description: errorMessage(e),
        variant: "error",
      }),
  });

  if (isLoading || !me) return <LoadingState />;

  const dirty = name !== me.Name || email !== me.Email;
  const initials = me.Name.split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="grid grid-cols-2 gap-[18px] max-w-[820px]">
      <Card>
        <CardHeader title="Informações pessoais" />
        <CardBody className="flex flex-col gap-3.5">
          <div className="flex items-center gap-3.5">
            <Avatar initials={initials} size={56} />
            <div>
              <div className="font-semibold text-[14px]">{me.Name}</div>
              <div className="text-[12px] text-fg-muted">@{me.Username}</div>
            </div>
          </div>
          <div>
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setName(me.Name);
                setEmail(me.Email);
              }}
              disabled={!dirty || updateM.isPending}
            >
              Desfazer
            </Button>
            <Button
              onClick={() => updateM.mutate()}
              disabled={!dirty || updateM.isPending}
            >
              {updateM.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Workspace" />
        <CardBody className="flex flex-col gap-3.5">
          <KV label="Tenant ID" value={me.TenantID} mono copyable />
          <KV label="User ID" value={me.ID} mono copyable />
          <KV
            label="Criado em"
            value={new Date(me.CreatedAt).toLocaleString("pt-BR")}
          />
        </CardBody>
      </Card>
    </div>
  );
}

function AppearanceTab() {
  const { theme, set } = useTheme();
  return (
    <Card className="max-w-[520px]">
      <CardHeader title="Tema" />
      <CardBody className="flex flex-col gap-3.5">
        <Label>Modo</Label>
        <Select
          value={theme}
          onChange={(e) => set(e.target.value as "light" | "dark")}
        >
          <option value="light">Claro</option>
          <option value="dark">Escuro</option>
        </Select>
      </CardBody>
    </Card>
  );
}

function ApiTab() {
  const { data: me } = useQuery(queries.me());
  return (
    <Card className="max-w-[760px]">
      <CardHeader
        title="Credenciais MQTT do workspace"
        subtitle="Use no firmware dos seus dispositivos pra publicar telemetria."
      />
      <CardBody className="flex flex-col gap-3.5">
        <KV label="Broker (TCP)" value="mqtt://localhost:1883" mono copyable />
        <KV label="Broker (TLS)" value="mqtts://localhost:8883" mono copyable />
        <KV
          label="WebSocket de telemetria"
          value={
            import.meta.env.VITE_WS_URL ?? "ws://localhost:8080/api/stream"
          }
          mono
          copyable
        />
        <KV
          label="API base URL"
          value={import.meta.env.VITE_API_URL ?? "http://localhost:8080"}
          mono
          copyable
        />
        {me && <KV label="Tenant ID" value={me.TenantID} mono copyable />}
        <div className="border-t border-border pt-3.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle mb-2">
            Endpoints disponíveis
          </div>
          <ul className="text-[12px] text-fg-muted flex flex-col gap-1 font-mono">
            <li>POST /api/devices/templates</li>
            <li>POST /api/devices/devices</li>
            <li>POST /api/devices/devices/:id/actuators</li>
            <li>POST /api/rules/rules</li>
            <li>POST /api/rules/scenarios</li>
            <li>GET /api/data/devices/:id/data</li>
            <li>GET /api/data/devices/:id/aggregations?field=…</li>
          </ul>
        </div>
      </CardBody>
    </Card>
  );
}

function IntegrationsTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const statusQ = useQuery({
    queryKey: ["google-calendar-status"],
    queryFn: () => googleCalendarAuthService.status(),
  });

  const connectM = useMutation({
    mutationFn: () => googleCalendarAuthService.startLogin(),
    onSuccess: ({ auth_url }) => {
      window.location.href = auth_url;
    },
    onError: (e) =>
      toast("Falha ao iniciar conexão", {
        description: errorMessage(e),
        variant: "error",
      }),
  });

  const disconnectM = useMutation({
    mutationFn: () => googleCalendarAuthService.disconnect(),
    onSuccess: () => {
      toast("Google Calendar desconectado", { variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["google-calendar-status"] });
    },
    onError: (e) =>
      toast("Falha ao desconectar", {
        description: errorMessage(e),
        variant: "error",
      }),
  });

  const connected = statusQ.data?.connected ?? false;

  return (
    <Card className="max-w-[620px]">
      <CardHeader
        title="Google Calendar"
        subtitle="Replica os eventos marcados no Calendário desta plataforma pro seu Google Calendar real."
      />
      <CardBody>
        {statusQ.isLoading ? (
          <LoadingState />
        ) : (
          <EmptyState
            icon="calendar"
            title={connected ? "Conta conectada" : "Nenhuma conta conectada"}
            description={
              connected
                ? "Todo evento novo criado na aba Calendário também é criado no seu Google Calendar."
                : "Conecte sua conta Google pra sincronizar os eventos criados aqui com o Google Calendar de verdade."
            }
            action={
              connected ? (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => disconnectM.mutate()}
                  disabled={disconnectM.isPending}
                >
                  {disconnectM.isPending ? "Desconectando…" : "Desconectar"}
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => connectM.mutate()}
                  disabled={connectM.isPending}
                >
                  {connectM.isPending ? "Redirecionando…" : "Conectar Google Calendar"}
                </Button>
              )
            }
          />
        )}
      </CardBody>
    </Card>
  );
}

function SessionTab() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  function logout() {
    clearTokens();
    queryClient.clear();
    toast("Sessão encerrada");
    navigate({ to: "/sign-in" });
  }

  return (
    <Card className="max-w-[520px]">
      <CardHeader title="Sessão" />
      <CardBody className="flex flex-col gap-3.5">
        <EmptyState
          icon="logout"
          title="Quer encerrar a sessão?"
          description="Você precisará entrar novamente para usar a aplicação."
          action={
            <Button variant="danger" onClick={logout}>
              <Icon name="logout" size={14} /> Sair
            </Button>
          }
        />
      </CardBody>
    </Card>
  );
}
