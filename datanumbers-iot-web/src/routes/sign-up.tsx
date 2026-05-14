import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { authService } from "@/api/services/auth";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { setTokens } from "@/lib/auth";
import { errorMessage, useToast } from "@/components/ui/Toast";

export const Route = createFileRoute("/sign-up")({
  component: SignUpPage,
});

function SignUpPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: "",
    company_name: "",
    email: "",
    username: "",
    password: "",
  });

  const signup = useMutation({
    mutationFn: async () => {
      await authService.register(form);
      const login = await authService.login(form.email, form.password);
      return login;
    },
    onSuccess: (data) => {
      setTokens(data.data.token, data.data.refresh_token);
      toast("Conta criada", {
        description: "Vamos te ajudar a conectar o primeiro dispositivo",
        variant: "success",
      });
      navigate({ to: "/onboarding" });
    },
    onError: (err) =>
      toast("Falha ao criar conta", {
        description: errorMessage(err),
        variant: "error",
      }),
  });

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const disabled =
    !form.name ||
    !form.company_name ||
    !form.email ||
    !form.username ||
    !form.password ||
    signup.isPending;

  return (
    <div className="min-h-screen grid place-items-center bg-bg px-6 py-10">
      <div className="w-full max-w-[440px]">
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-[28px] h-[28px] rounded-md grid place-items-center text-white font-extrabold text-[14px] tracking-tighter bg-gradient-to-br from-accent to-[oklch(0.62_0.2_285)]">
            d.
          </div>
          <div className="font-bold text-base">DataNumbers</div>
        </div>

        <Card>
          <CardBody className="p-7">
            <h1 className="text-[22px] font-bold tracking-tight mb-1">
              Crie sua conta
            </h1>
            <p className="text-[13px] text-fg-muted mb-6">
              Você ganha um workspace próprio com broker MQTT, regras e dashboards
            </p>

            <form
              className="flex flex-col gap-3.5"
              onSubmit={(e) => {
                e.preventDefault();
                if (!disabled) signup.mutate();
              }}
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Seu nome</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    autoComplete="name"
                    required
                  />
                </div>
                <div>
                  <Label>Empresa / projeto</Label>
                  <Input
                    value={form.company_name}
                    onChange={(e) => set("company_name", e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <div>
                <Label>Username</Label>
                <Input
                  value={form.username}
                  onChange={(e) => set("username", e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
              <div>
                <Label>Senha</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </div>
              <Button
                size="lg"
                type="submit"
                disabled={disabled}
                className="mt-1"
              >
                {signup.isPending ? "Criando…" : "Criar conta"}
              </Button>
            </form>
          </CardBody>
        </Card>

        <p className="text-center text-[12px] text-fg-muted mt-5">
          Já tem conta?{" "}
          <Link to="/sign-in" className="text-accent font-medium">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
