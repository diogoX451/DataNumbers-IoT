import { api } from "@/lib/api";
import type { CreateTemplatePayload, Template } from "../types";

export const templatesService = {
  async list(): Promise<Template[]> {
    const { data } = await api.get<{ data: Template[] }>(
      "/api/devices/templates",
    );
    return data.data ?? [];
  },

  async get(id: string): Promise<Template> {
    const { data } = await api.get<Template>(`/api/devices/templates/${id}`);
    return data;
  },

  async create(payload: CreateTemplatePayload): Promise<Template> {
    const { data } = await api.post<Template>(
      "/api/devices/templates",
      payload,
    );
    return data;
  },

  async update(id: string, payload: CreateTemplatePayload): Promise<Template> {
    const { data } = await api.put<Template>(
      `/api/devices/templates/${id}`,
      payload,
    );
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/api/devices/templates/${id}`);
  },
};
