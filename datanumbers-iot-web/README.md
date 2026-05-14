# DataNumbers IoT — Web

Frontend reescrito do zero com **Vite + React 19 + TypeScript**, usando
**TanStack Router** (file-based) e **TanStack Query** para data fetching.

## Stack

- **Vite 6** — build/dev server
- **React 19** + TypeScript strict
- **TanStack Router** — roteamento type-safe, file-based em `src/routes/`
- **TanStack Query** — cache de dados + devtools
- **Tailwind 3** — utilitários atrelados a tokens em CSS custom properties
- **axios** — cliente HTTP com interceptor de refresh de JWT

## Scripts

```bash
npm install
npm run dev        # dev em http://localhost:3000
npm run build      # gera dist/ pronto para servir
npm run preview    # serve dist/ localmente
npm run typecheck  # tsc --noEmit
```

## Estrutura

```
src/
├── main.tsx              # bootstrap (Router + QueryClient + ThemeProvider)
├── routes/               # rotas (file-based — TanStack Router plugin)
│   ├── __root.tsx
│   ├── _app.tsx          # layout autenticado (sidebar)
│   ├── _app.index.tsx    # /
│   ├── _app.devices.index.tsx
│   ├── _app.devices.$id.tsx
│   ├── _app.spaces.index.tsx
│   ├── _app.spaces.$id.tsx
│   ├── _app.rules.index.tsx
│   ├── _app.rules.$id.tsx        # também serve /rules/new
│   ├── _app.templates.tsx
│   ├── _app.activity.tsx
│   ├── _app.settings.tsx
│   ├── sign-in.tsx
│   └── onboarding.tsx
├── layout/               # Sidebar + Topbar + Shell
├── components/           # UI reutilizável (Button, Card, Pill, etc.)
│   ├── ui/               # primitivos
│   └── charts/           # Sparkline, LiveChart, SignalBars, BatteryBar
├── api/queries.ts        # TanStack Query factories (mock → backend)
├── data/                 # tipos + mock data
├── lib/
│   ├── api.ts            # axios + interceptor /auth/refresh
│   ├── auth.ts           # storage de tokens
│   ├── theme.tsx         # ThemeProvider (light/dark)
│   ├── query.ts          # QueryClient singleton
│   └── cn.ts             # clsx + tailwind-merge
└── styles/globals.css    # tokens (CSS custom properties)
```

## Tema

Light/dark é controlado por `data-theme="light|dark"` no `<html>`. As cores
ficam em `src/styles/globals.css` como CSS custom properties, e o
`tailwind.config.ts` aponta os utilitários (`bg-bg`, `text-fg`, etc) para
essas variáveis. Para mudar a paleta inteira, só editar o CSS.

O componente `useTheme()` (em `src/lib/theme.tsx`) persiste a escolha
em `localStorage` e respeita `prefers-color-scheme` no primeiro load.

## Mock vs backend real

Por enquanto, as queries em `src/api/queries.ts` resolvem com dados de
`src/data/mock.ts`. Para conectar ao backend:

1. Substituir cada `queryFn` por chamada via `api` (definido em `src/lib/api.ts`).
2. O interceptor de refresh já está pronto: 401 → tenta `/api/auth/refresh`
   com o `refresh_token` salvo, troca o par e refaz a request.
3. As variáveis de ambiente são:
   - `VITE_API_URL` — base URL do nginx/API gateway (default `http://localhost:8080`)
   - `VITE_WS_URL` — endpoint WebSocket para telemetria ao vivo

## Roteamento

O TanStack Router gera `src/routeTree.gen.ts` a partir dos arquivos em
`src/routes/`. Esse arquivo é **gerado** (está no `.gitignore`) — basta
rodar `npm run dev` ou `npm run build` que o plugin do Vite cria.

Convenção:

- `_app` → layout aninhado (sidebar). Tudo dentro herda o shell autenticado.
- `_app.devices.$id.tsx` → `/devices/:id` (param tipado via `Route.useParams()`).
- `sign-in.tsx`, `onboarding.tsx` → rotas top-level sem sidebar.

## Docker

A imagem é multi-stage: Node faz o build, nginx serve o `dist/`. O Compose
expõe na porta `${WEB_PORT:-3000}` da máquina host.

```bash
docker compose up -d web
```
