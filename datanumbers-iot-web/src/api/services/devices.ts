import { api } from "@/lib/api";
import type {
  Actuator,
  CreateActuatorPayload,
  CreateDevicePayload,
  Device,
  UpdateDevicePayload,
} from "../types";

export const devicesService = {
  async list(): Promise<Device[]> {
    const { data } = await api.get<{ data: Device[] }>("/api/devices/devices");
    return data.data ?? [];
  },

  async get(id: string): Promise<Device> {
    const { data } = await api.get<Device>(`/api/devices/devices/${id}`);
    return data;
  },

  async create(payload: CreateDevicePayload): Promise<Device> {
    const { data } = await api.post<Device>("/api/devices/devices", payload);
    return data;
  },

  async update(id: string, payload: UpdateDevicePayload): Promise<Device> {
    const { data } = await api.put<Device>(
      `/api/devices/devices/${id}`,
      payload,
    );
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/api/devices/devices/${id}`);
  },
};

export const actuatorsService = {
  async list(deviceId: string): Promise<Actuator[]> {
    const { data } = await api.get<{ data: Actuator[] }>(
      `/api/devices/devices/${deviceId}/actuators`,
    );
    return data.data ?? [];
  },

  async create(
    deviceId: string,
    payload: CreateActuatorPayload,
  ): Promise<Actuator> {
    const { data } = await api.post<Actuator>(
      `/api/devices/devices/${deviceId}/actuators`,
      payload,
    );
    return data;
  },

  async update(id: string, payload: Partial<CreateActuatorPayload>) {
    await api.put(`/api/devices/actuators/${id}`, payload);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/api/devices/actuators/${id}`);
  },
};
