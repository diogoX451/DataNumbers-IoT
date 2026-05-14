import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { authService } from "@/api/services/auth";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { setTokens } from "@/lib/auth";
import { errorMessage, useToast } from "@/components/ui/Toast";

type Search = { redirect?: string };

export const Route = createFileRoute("/sign-in")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = useMutation({
    mutationFn: () => authService.login(email, password),
    onSuccess: (data) => {
      setTokens(data.data.token, data.data.refresh_token);
      toast("Bem-vindo de volta", { variant: "success" });
      if (redirect) {
        window.location.href = redirect;
      } else {
        navigate({ to: "/" });
      }
    },
    onError: (err) => {
      toast("Falha no login", {
        description: errorMessage(err),
        variant: "error",
      });
    },
  });

  return (
    <div className="min-h-screen grid place-items-center bg-bg px-6">
      <div className="w-full max-w-[400px]">
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-[28px] h-[28px] rounded-md grid place-items-center text-white font-extrabold text-[14px] tracking-tighter bg-gradient-to-br from-accent to-[oklch(0.62_0.2_285)]">
            d.
          </div>
          <div className="font-bold text-base">DataNumbers</div>
        </div>

        <Card>
          <CardBody className="p-7">
            <h1 className="text-[22px] font-bold tracking-tight mb-1">
              Bem-vindo de volta
            </h1>
            <p className="text-[13px] text-fg-muted mb-6">
              Entre na sua conta pra continuar
            </p>

            <form
              className="flex flex-col gap-3.5"
              onSubmit={(e) => {
                e.preventDefault();
                if (!email || !password) return;
                login.mutate();
              }}
            >
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                  required
                />
              </div>
              <div>
                <Label className="flex justify-between">
                  <span>Senha</span>
                  <span className="text-accent text-[11px] cursor-pointer font-normal">
                    Esqueceu?
                  </span>
                </Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              <Button
                size="lg"
                type="submit"
                disabled={login.isPending}
                className="mt-1"
              >
                {login.isPending ? "Entrando…" : "Entrar"}
              </Button>
            </form>
          </CardBody>
        </Card>

        <p className="text-center text-[12px] text-fg-muted mt-5">
          Novo aqui?{" "}
          <Link to="/sign-up" className="text-accent font-medium">
            Crie uma conta
          </Link>
        </p>
      </div>
    </div>
  );
}
