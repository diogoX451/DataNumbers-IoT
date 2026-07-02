import { api } from "@/lib/api";
import type { CalendarEvent, CreateCalendarEventPayload } from "../types";

export const calendarService = {
  async list(): Promise<CalendarEvent[]> {
    const { data } = await api.get<CalendarEvent[]>("/api/calendar/events");
    return data ?? [];
  },

  async create(payload: CreateCalendarEventPayload): Promise<CalendarEvent> {
    const { data } = await api.post<CalendarEvent>(
      "/api/calendar/events",
      payload,
    );
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/api/calendar/events/${id}`);
  },
};

export const googleCalendarAuthService = {
  async status(): Promise<{ connected: boolean }> {
    const { data } = await api.get<{ connected: boolean }>(
      "/api/calendar/auth/status",
    );
    return data;
  },

  async startLogin(): Promise<{ auth_url: string }> {
    const { data } = await api.post<{ auth_url: string }>(
      "/api/calendar/auth/login",
    );
    return data;
  },

  async disconnect(): Promise<void> {
    await api.delete("/api/calendar/auth");
  },
};
