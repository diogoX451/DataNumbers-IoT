import { api } from "@/lib/api";
import type { CreateAclPayload, HistoryEntry } from "../types";

export const gatewayService = {
  async createAcl(payload: CreateAclPayload): Promise<void> {
    await api.post("/api/gateway/create-acl", payload);
  },

  async listHistorys(): Promise<HistoryEntry[]> {
    const { data } = await api.get<{ data: HistoryEntry[] }>(
      "/api/gateway/historys",
    );
    return data.data ?? [];
  },
};
