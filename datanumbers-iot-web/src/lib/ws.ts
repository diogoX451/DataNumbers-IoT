import { useEffect, useRef, useState } from "react";
import { getAccessToken } from "./auth";
import type { TelemetryEnvelope } from "@/api/types";

type Status = "connecting" | "open" | "closed" | "error";

type Options<T> = {
  parse?: (raw: string) => T | null;
  onMessage?: (msg: T) => void;
  maxRetries?: number;
};

function streamUrl(): string {
  const base =
    (import.meta.env.VITE_WS_URL as string | undefined) ??
    "ws://localhost:8080/api/stream";
  const token = getAccessToken();
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
}

/**
 * Conexão única ao WebSocket de telemetria. Reconnect exponencial,
 * cleanup automático no unmount, parse padrão pra `TelemetryEnvelope`.
 */
export function useTelemetryStream<T = TelemetryEnvelope>(
  opts: Options<T> = {},
) {
  const [status, setStatus] = useState<Status>("connecting");
  const [last, setLast] = useState<T | null>(null);
  const retries = useRef(0);
  const sock = useRef<WebSocket | null>(null);
  const closedByUser = useRef(false);
  const onMessageRef = useRef(opts.onMessage);
  const parseRef = useRef(opts.parse);
  onMessageRef.current = opts.onMessage;
  parseRef.current = opts.parse;

  useEffect(() => {
    closedByUser.current = false;
    let cancelled = false;

    function connect() {
      if (cancelled) return;
      setStatus("connecting");
      const ws = new WebSocket(streamUrl());
      sock.current = ws;

      ws.onopen = () => {
        retries.current = 0;
        setStatus("open");
      };

      ws.onmessage = (e) => {
        try {
          const data = parseRef.current
            ? parseRef.current(String(e.data))
            : (JSON.parse(String(e.data)) as T);
          if (data != null) {
            setLast(data);
            onMessageRef.current?.(data);
          }
        } catch {
          // payload mal formado — descartamos silenciosamente
        }
      };

      ws.onerror = () => setStatus("error");

      ws.onclose = () => {
        setStatus("closed");
        if (cancelled || closedByUser.current) return;
        const max = opts.maxRetries ?? 8;
        if (retries.current >= max) return;
        retries.current += 1;
        const delay = Math.min(30_000, 500 * 2 ** retries.current);
        setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      cancelled = true;
      closedByUser.current = true;
      sock.current?.close();
    };
  }, [opts.maxRetries]);

  return { status, last };
}
