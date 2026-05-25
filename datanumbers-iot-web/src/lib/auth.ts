/**
 * Storage de sessão + helpers de auth. Por enquanto, tokens em
 * localStorage (HTTPS via cookie HttpOnly fica para uma futura iteração
 * com BFF). Esse arquivo é o único ponto autorizado a ler/escrever
 * tokens — qualquer consumidor importa daqui.
 */

const ACCESS_KEY = "datanumbers.token";
const REFRESH_KEY = "datanumbers.refresh";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getAccessToken(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access: string, refresh?: string) {
  if (!isBrowser()) return;
  window.localStorage.setItem(ACCESS_KEY, access);
  if (refresh) window.localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}

export function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

/** Decodifica o payload do JWT sem validar assinatura. */
export function decodeToken<
  T extends { data?: { user_id?: string; tenant_id?: string }; exp?: number },
>(token: string | null = getAccessToken()): T | null {
  if (!token) return null;
  try {
    const [, payload] = token.split(".");
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export function isTokenExpired(): boolean {
  const decoded = decodeToken();
  if (!decoded?.exp) return true;
  return decoded.exp * 1000 < Date.now();
}
