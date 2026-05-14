import { api } from "@/lib/api";
import type { AggregationResponse, TelemetryRow } from "../types";

export const telemetryService = {
  async list(
    deviceId: string,
    opts: { from?: string; to?: string; limit?: number } = {},
  ): Promise<TelemetryRow[]> {
    const params = new URLSearchParams();
    if (opts.from) params.set("from", opts.from);
    if (opts.to) params.set("to", opts.to);
    if (opts.limit) params.set("limit", String(opts.limit));
    const q = params.toString() ? `?${params.toString()}` : "";
    const { data } = await api.get<{ data: TelemetryRow[] }>(
      `/api/data/devices/${deviceId}/data${q}`,
    );
    return data.data ?? [];
  },

  async aggregate(
    deviceId: string,
    field: string,
    opts: { bucket?: string; from?: string; to?: string } = {},
  ): Promise<AggregationResponse> {
    const params = new URLSearchParams({ field });
    if (opts.bucket) params.set("bucket", opts.bucket);
    if (opts.from) params.set("from", opts.from);
    if (opts.to) params.set("to", opts.to);
    const { data } = await api.get<AggregationResponse>(
      `/api/data/devices/${deviceId}/aggregations?${params.toString()}`,
    );
    return data;
  },
};
