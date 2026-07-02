import { queryOptions } from "@tanstack/react-query";
import { authService } from "./services/auth";
import { calendarService } from "./services/calendar";
import { actuatorsService, devicesService } from "./services/devices";
import { gatewayService } from "./services/gateway";
import { rulesService, scenariosService } from "./services/rules";
import { telemetryService } from "./services/telemetry";
import { templatesService } from "./services/templates";

/**
 * Query keys centralizadas — qualquer mutação invalida via essas chaves
 * em vez de strings soltas.
 */
export const qk = {
  me: () => ["me"] as const,
  templates: () => ["templates"] as const,
  template: (id: string) => ["templates", id] as const,
  devices: () => ["devices"] as const,
  device: (id: string) => ["devices", id] as const,
  actuators: (deviceId: string) => ["devices", deviceId, "actuators"] as const,
  scenarios: () => ["scenarios"] as const,
  scenarioDevices: (id: string) => ["scenarios", id, "devices"] as const,
  rules: (scenarioId?: string) =>
    scenarioId ? (["rules", { scenarioId }] as const) : (["rules"] as const),
  rule: (id: string) => ["rules", id] as const,
  ruleActions: (id: string) => ["rules", id, "actions"] as const,
  telemetry: (id: string, p?: { from?: string; to?: string; limit?: number }) =>
    ["telemetry", id, p] as const,
  aggregation: (
    id: string,
    field: string,
    p?: { bucket?: string; from?: string; to?: string },
  ) => ["aggregation", id, field, p] as const,
  historys: () => ["historys"] as const,
  calendarEvents: () => ["calendarEvents"] as const,
};

export const queries = {
  me: () =>
    queryOptions({
      queryKey: qk.me(),
      queryFn: () => authService.me(),
      staleTime: 5 * 60_000,
    }),

  templates: () =>
    queryOptions({
      queryKey: qk.templates(),
      queryFn: () => templatesService.list(),
    }),

  template: (id: string) =>
    queryOptions({
      queryKey: qk.template(id),
      queryFn: () => templatesService.get(id),
    }),

  devices: () =>
    queryOptions({
      queryKey: qk.devices(),
      queryFn: () => devicesService.list(),
      refetchInterval: 30_000,
    }),

  device: (id: string) =>
    queryOptions({
      queryKey: qk.device(id),
      queryFn: () => devicesService.get(id),
    }),

  actuators: (deviceId: string) =>
    queryOptions({
      queryKey: qk.actuators(deviceId),
      queryFn: () => actuatorsService.list(deviceId),
    }),

  scenarios: () =>
    queryOptions({
      queryKey: qk.scenarios(),
      queryFn: () => scenariosService.list(),
    }),

  scenarioDevices: (id: string) =>
    queryOptions({
      queryKey: qk.scenarioDevices(id),
      queryFn: () => scenariosService.listDevices(id),
    }),

  rules: (scenarioId?: string) =>
    queryOptions({
      queryKey: qk.rules(scenarioId),
      queryFn: () => rulesService.list(scenarioId),
    }),

  rule: (id: string) =>
    queryOptions({
      queryKey: qk.rule(id),
      queryFn: () => rulesService.get(id),
    }),

  ruleActions: (id: string) =>
    queryOptions({
      queryKey: qk.ruleActions(id),
      queryFn: () => rulesService.listActions(id),
    }),

  telemetry: (
    id: string,
    params?: { from?: string; to?: string; limit?: number },
  ) =>
    queryOptions({
      queryKey: qk.telemetry(id, params),
      queryFn: () => telemetryService.list(id, params),
    }),

  aggregation: (
    id: string,
    field: string,
    params?: { bucket?: string; from?: string; to?: string },
  ) =>
    queryOptions({
      queryKey: qk.aggregation(id, field, params),
      queryFn: () => telemetryService.aggregate(id, field, params),
    }),

  historys: () =>
    queryOptions({
      queryKey: qk.historys(),
      queryFn: () => gatewayService.listHistorys(),
    }),

  calendarEvents: () =>
    queryOptions({
      queryKey: qk.calendarEvents(),
      queryFn: () => calendarService.list(),
    }),
};
