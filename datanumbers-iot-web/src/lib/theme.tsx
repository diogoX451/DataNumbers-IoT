import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

type Theme = "light" | "dark";

type ThemeCtx = {
  theme: Theme;
  toggle: () => void;
  set: (t: Theme) => void;
};

const Ctx = createContext<ThemeCtx | null>(null);

const STORAGE_KEY = "datanumbers.theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Default sempre "light" — só respeita a escolha explícita do usuário
  // gravada em localStorage. Sem auto-detect de prefers-color-scheme pra
  // o app aparecer consistente na primeira visita.
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const value: ThemeCtx = {
    theme,
    set: setTheme,
    toggle: () => setTheme((t) => (t === "light" ? "dark" : "light")),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTheme must be used inside <ThemeProvider>");
  return v;
}
