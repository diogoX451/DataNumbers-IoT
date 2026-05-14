import { api } from "@/lib/api";
import type {
  LoginResponse,
  Me,
  RegisterPayload,
  RegisterResponse,
} from "../types";

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>("/api/auth/user/login", {
      email,
      password,
    });
    return data;
  },

  async register(payload: RegisterPayload): Promise<RegisterResponse> {
    const { data } = await api.post<RegisterResponse>(
      "/api/auth/register-user",
      payload,
    );
    return data;
  },

  async me(): Promise<Me> {
    const { data } = await api.get<{ data: Me }>("/api/auth/find-user");
    return data.data;
  },

  async checkUsername(username: string): Promise<boolean> {
    const { data } = await api.post<{ data: boolean }>(
      "/api/auth/check-username",
      { username },
    );
    return data.data;
  },

  async updateProfile(payload: { name: string; email: string }): Promise<void> {
    await api.put("/api/auth/update-user", payload);
  },
};
