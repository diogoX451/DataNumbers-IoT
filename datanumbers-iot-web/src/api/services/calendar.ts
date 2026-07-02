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
