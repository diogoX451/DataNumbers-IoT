import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queries } from "@/api/queries";
import { Icon, type IconName } from "@/components/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { useTheme } from "@/lib/theme";
import { clearTokens } from "@/lib/auth";

type NavSection =
  | { kind: "section"; label: string }
  | {
      kind: "item";
      to:
        | "/"
        | "/devices"
        | "/spaces"
        | "/activity"
        | "/templates"
        | "/rules"
        | "/settings";
      label: string;
      icon: IconName;
      activeIf?: (pathname: string) => boolean;
    };

const NAV: NavSection[] = [
  { kind: "section", label: "Workspace" },
  { kind: "item", to: "/", label: "Início", icon: "home" },
  {
    kind: "item",
    to: "/devices",
    label: "Dispositivos",
    icon: "cpu",
    activeIf: (p) => p.startsWith("/devices"),
  },
  {
    kind: "item",
    to: "/spaces",
    label: "Spaces",
    icon: "spaces",
    activeIf: (p) => p.startsWith("/spaces"),
  },
  { kind: "item", to: "/activity", label: "Atividade", icon: "activity" },
  { kind: "section", label: "Biblioteca" },
  { kind: "item", to: "/templates", label: "Templates", icon: "layers" },
  {
    kind: "item",
    to: "/rules",
    label: "Automações",
    icon: "workflow",
    activeIf: (p) => p.startsWith("/rules"),
  },
  { kind: "section", label: "Conta" },
  { kind: "item", to: "/settings", label: "Configurações", icon: "settings" },
];

export function Sidebar() {
  const { theme, toggle } = useTheme();
  const { location } = useRouterState();
  const pathname = location.pathname;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: me } = useQuery(queries.me());
  const { data: devices } = useQuery(queries.devices());
  const { data: spaces } = useQuery(queries.scenarios());

  const counts: Partial<Record<NavSection extends { to: infer T } ? T : never, number | undefined>> = {
    "/devices": devices?.length,
    "/spaces": spaces?.length,
  };

  function handleLogout() {
    clearTokens();
    queryClient.clear();
    toast("Sessão encerrada");
    navigate({ to: "/sign-in" });
  }

  const initials = me?.Name
    ? me.Name.split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0]?.toUpperCase() ?? "")
        .join("")
    : "?";

  return (
    <aside className="bg-bg-elev border-r border-border flex flex-col sticky top-0 h-screen w-[var(--sidebar-w)]">
      <div className="flex items-center gap-2.5 px-[18px] border-b border-border h-[var(--header-h)]">
        <div className="w-[26px] h-[26px] rounded-md grid place-items-center text-white font-extrabold text-[13px] tracking-tighter bg-gradient-to-br from-accent to-[oklch(0.62_0.2_285)]">
          d.
        </div>
        <div className="min-w-0">
          <div className="text-[14px] font-bold tracking-tight leading-none">
            DataNumbers
          </div>
          <div className="text-[11px] text-fg-subtle truncate mt-0.5">
            {me ? `Tenant ${me.TenantID.slice(0, 8)}` : (
              <Skeleton width={80} height={10} />
            )}
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3.5 px-2.5">
        {NAV.map((item, i) => {
          if (item.kind === "section") {
            return (
              <div
                key={`s-${i}`}
                className="text-[10px] font-semibold tracking-wider uppercase text-fg-subtle px-2.5 pt-3.5 pb-1.5"
              >
                {item.label}
              </div>
            );
          }
          const isExact = pathname === item.to;
          const isActive = item.activeIf ? item.activeIf(pathname) : isExact;
          const badge = (counts as Record<string, number | undefined>)[item.to];
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-sm text-[13px] font-medium select-none",
                isActive
                  ? "bg-bg-hover text-fg font-semibold"
                  : "text-fg-muted hover:bg-bg-hover hover:text-fg",
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded bg-accent" />
              )}
              <Icon name={item.icon} size={15} />
              <span>{item.label}</span>
              {badge != null && (
                <span className="ml-auto text-[10px] font-semibold px-1.5 py-px rounded-full bg-bg-hover text-fg-muted">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-2.5 flex items-center gap-2.5">
        <Link
          to="/settings"
          className="flex-1 flex items-center gap-2.5 px-2 py-1.5 rounded-sm hover:bg-bg-hover text-left min-w-0"
        >
          <Avatar initials={initials} />
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] font-semibold truncate leading-tight">
              {me?.Name ?? <Skeleton width={80} height={10} />}
            </span>
            <span className="block text-[11px] text-fg-subtle truncate leading-tight">
              {me?.Email ?? <Skeleton width={100} height={10} />}
            </span>
          </span>
        </Link>
        <button
          type="button"
          onClick={toggle}
          aria-label="Alternar tema"
          className="w-8 h-8 grid place-items-center rounded-sm text-fg-muted hover:bg-bg-hover hover:text-fg"
        >
          <Icon name={theme === "light" ? "moon" : "sun"} size={15} />
        </button>
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Sair"
          className="w-8 h-8 grid place-items-center rounded-sm text-fg-muted hover:bg-danger-bg hover:text-danger"
        >
          <Icon name="logout" size={15} />
        </button>
      </div>
    </aside>
  );
}
