"use client";

import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

const POLL_INTERVAL = 60_000;
const REQUEST_TIMEOUT = 20_000;

type NotificationUpdateHandler = (signal?: AbortSignal) => Promise<void>;

function useLatestHandler(handler: NotificationUpdateHandler) {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  return handlerRef;
}

export function useNotificationUpdates({
  enabled,
  onUpdate,
}: {
  enabled: boolean;
  onUpdate: NotificationUpdateHandler;
}) {
  const handlerRef = useLatestHandler(onUpdate);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const configuredTransport =
      process.env.NEXT_PUBLIC_NOTIFICATION_TRANSPORT;
    const useSockets =
      configuredTransport === "socket" ||
      (!configuredTransport && process.env.NODE_ENV === "development");

    if (useSockets) {
      let disposed = false;
      let socket: ReturnType<typeof io> | null = null;

      void fetch("/api/realtime/notification-token", {
        method: "POST",
        cache: "no-store",
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`Unable to authorize socket (${response.status}).`);
          }

          return (await response.json()) as { token: string };
        })
        .then(({ token }) => {
          if (disposed) {
            return;
          }

          socket = io({
            path: "/socket.io",
            transports: ["websocket"],
            auth: { token },
          });
          socket.on("connect", () => void handlerRef.current());
          socket.on("notification:updated", () => void handlerRef.current());
          socket.on("connect_error", (error) => {
            console.error("Notification socket connection error:", error);
          });
        })
        .catch((error) => {
          console.error("Notification socket setup error:", error);
        });

      return () => {
        disposed = true;
        socket?.disconnect();
      };
    }

    let cancelled = false;
    let timeoutId: number | null = null;
    let requestTimeoutId: number | null = null;
    let controller: AbortController | null = null;
    let requestSequence = 0;

    function clearPending() {
      requestSequence += 1;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
      controller?.abort();
      controller = null;

      if (requestTimeoutId !== null) {
        window.clearTimeout(requestTimeoutId);
        requestTimeoutId = null;
      }
    }

    async function poll() {
      if (cancelled || document.visibilityState !== "visible") {
        return;
      }

      const sequence = ++requestSequence;
      controller = new AbortController();
      requestTimeoutId = window.setTimeout(
        () => controller?.abort(),
        REQUEST_TIMEOUT,
      );

      try {
        await handlerRef.current(controller.signal);
      } catch (error) {
        if (!(error instanceof Error && error.name === "AbortError")) {
          console.error("Notification polling error:", error);
        }
      } finally {
        if (requestTimeoutId !== null) {
          window.clearTimeout(requestTimeoutId);
          requestTimeoutId = null;
        }
        controller = null;

        if (
          !cancelled &&
          sequence === requestSequence &&
          document.visibilityState === "visible"
        ) {
          timeoutId = window.setTimeout(() => void poll(), POLL_INTERVAL);
        }
      }
    }

    function handleVisibilityChange() {
      clearPending();

      if (document.visibilityState === "visible") {
        void poll();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    void poll();

    return () => {
      cancelled = true;
      clearPending();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, handlerRef]);
}
