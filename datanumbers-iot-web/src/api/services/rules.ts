import { api } from "@/lib/api";
import type {
  CreateActionPayload,
  CreateRulePayload,
  CreateScenarioPayload,
  Rule,
  RuleAction,
  Scenario,
  ScenarioDevice,
  UpdateRulePayload,
} from "../types";

export const rulesService = {
  async list(scenarioId?: string): Promise<Rule[]> {
    const q = scenarioId ? `?scenario_id=${encodeURIComponent(scenarioId)}` : "";
    const { data } = await api.get<Rule[]>(`/api/rules/rules${q}`);
    return data ?? [];
  },

  async get(id: string): Promise<Rule> {
    const { data } = await api.get<Rule>(`/api/rules/rules/${id}`);
    return data;
  },

  async create(payload: CreateRulePayload): Promise<Rule> {
    const { data } = await api.post<Rule>("/api/rules/rules", payload);
    return data;
  },

  async update(id: string, payload: UpdateRulePayload): Promise<void> {
    await api.put(`/api/rules/rules/${id}`, payload);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/api/rules/rules/${id}`);
  },

  async listActions(ruleId: string): Promise<RuleAction[]> {
    const { data } = await api.get<RuleAction[]>(
      `/api/rules/rules/${ruleId}/actions`,
    );
    return data ?? [];
  },

  async createAction(
    ruleId: string,
    payload: CreateActionPayload,
  ): Promise<RuleAction> {
    const { data } = await api.post<RuleAction>(
      `/api/rules/rules/${ruleId}/actions`,
      payload,
    );
    return data;
  },

  async removeAction(ruleId: string, actionId: string): Promise<void> {
    await api.delete(`/api/rules/rules/${ruleId}/actions/${actionId}`);
  },
};

export const scenariosService = {
  async list(): Promise<Scenario[]> {
    const { data } = await api.get<Scenario[]>("/api/rules/scenarios");
    return data ?? [];
  },

  async create(payload: CreateScenarioPayload): Promise<Scenario> {
    const { data } = await api.post<Scenario>("/api/rules/scenarios", payload);
    return data;
  },

  async update(id: string, payload: CreateScenarioPayload): Promise<void> {
    await api.put(`/api/rules/scenarios/${id}`, payload);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/api/rules/scenarios/${id}`);
  },

  async listDevices(id: string): Promise<ScenarioDevice[]> {
    const { data } = await api.get<ScenarioDevice[]>(
      `/api/rules/scenarios/${id}/devices`,
    );
    return data ?? [];
  },

  async linkDevice(id: string, deviceId: string): Promise<void> {
    await api.post(`/api/rules/scenarios/${id}/devices`, {
      device_id: deviceId,
    });
  },

  async unlinkDevice(id: string, deviceId: string): Promise<void> {
    await api.delete(`/api/rules/scenarios/${id}/devices/${deviceId}`);
  },
};
