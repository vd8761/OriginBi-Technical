"use client";

import { useEffect } from "react";
import { API_BASE, getAccessToken } from "@/lib/api";
import { usePluginRuntime } from "./PluginProvider";

interface WireCommand {
  kind?: string;
  payload?: unknown;
}

export function useCommandStream(attemptId: string | null | undefined) {
  const runtime = usePluginRuntime();

  useEffect(() => {
    if (!attemptId || !runtime) return;
    if (typeof window === "undefined") return;

    let stopped = false;
    let controller: AbortController | null = null;

    const open = async () => {
      while (!stopped) {
        controller = new AbortController();
        try {
          const token = getAccessToken();
          const headers = new Headers({ Accept: "text/event-stream" });
          if (token) headers.set("Authorization", `Bearer ${token}`);
          const response = await fetch(
            `${API_BASE}/v1/attempts/${encodeURIComponent(attemptId)}/commands`,
            {
              credentials: "include",
              headers,
              signal: controller.signal,
            },
          );
          if (!response.ok || !response.body) {
            throw new Error(`command stream HTTP ${response.status}`);
          }
          await readSSE(response.body, (eventName, data) => {
            const decoded = decodePayload(data);
            const command = decoded as WireCommand;
            const kind = eventName || command.kind || "message";
            runtime.publish(kind, command.payload ?? decoded);
          });
        } catch (err) {
          if (!stopped && !(err instanceof DOMException && err.name === "AbortError")) {
            console.warn(`[plugins] command stream error on attempt ${attemptId}`, err);
          }
        }
        if (!stopped) {
          await delay(1500);
        }
      }
    };

    void open();

    return () => {
      stopped = true;
      controller?.abort();
    };
  }, [attemptId, runtime]);
}

async function readSSE(
  body: ReadableStream<Uint8Array>,
  onEvent: (eventName: string, data: string) => void,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      buffer = buffer.replace(/\r\n/g, "\n");
      let boundary = buffer.indexOf("\n\n");
      while (boundary >= 0) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        dispatchSSEBlock(block, onEvent);
        boundary = buffer.indexOf("\n\n");
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function dispatchSSEBlock(block: string, onEvent: (eventName: string, data: string) => void) {
  if (!block.trim() || block.startsWith(":")) return;
  let eventName = "message";
  const data: string[] = [];
  for (const line of block.split("\n")) {
    if (line.startsWith(":")) continue;
    if (line.startsWith("event:")) {
      eventName = line.slice("event:".length).trim() || "message";
      continue;
    }
    if (line.startsWith("data:")) {
      data.push(line.slice("data:".length).trimStart());
    }
  }
  onEvent(eventName, data.join("\n"));
}

function decodePayload(data: string): unknown {
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
