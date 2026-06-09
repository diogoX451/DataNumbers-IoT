import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "./auth";

const BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  "http://localhost:8080";

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

/**
 * Interceptor de refresh: se um 401 chegar em uma rota autenticada,
 * tentamos trocar o refresh_token por um novo par. Se conseguir,
 * reenviamos a requisição original; se não, derrubamos a sessão.
 *
 * Marcamos `__retry` no request pra evitar loop infinito.
 */
type RetriableConfig = InternalAxiosRequestConfig & { __retry?: boolean };

let refreshInFlight: Promise<string | null> | null = null;

async function refresh(): Promise<string | null> {
  const rt = getRefreshToken();
  if (!rt) return null;
  if (!refreshInFlight) {
    refreshInFlight = axios
      .post(
        `${BASE_URL}/api/auth/refresh`,
        { refresh_token: rt },
        { headers: { "Content-Type": "application/json" } },
      )
      .then((res) => {
        const access = res.data?.data?.token as string | undefined;
        const newRefresh = res.data?.data?.refresh_token as string | undefined;
        if (access) setTokens(access, newRefresh);
        return access ?? null;
      })
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    if (
      error.response?.status === 401 &&
      original &&
      !original.__retry &&
      getRefreshToken()
    ) {
      original.__retry = true;
      const newAccess = await refresh();
      if (newAccess) {
        original.headers.set("Authorization", `Bearer ${newAccess}`);
        return api.request(original);
      }
      clearTokens();
    }
    return Promise.reject(error);
  },
);
