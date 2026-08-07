"use client";

import { useCallback, useEffect, useState } from "react";

import type { AlertVariant } from "@/components/ui/alert";

type AlertState = {
  message: string;
  variant: AlertVariant;
} | null;

type ShowAlertOptions = {
  variant?: AlertVariant;
  duration?: number;
};

export function useAlert() {
  const [alert, setAlert] = useState<AlertState>(null);
  const [duration, setDuration] = useState(5000);

  const closeAlert = useCallback(() => {
    setAlert(null);
  }, []);

  const showAlert = useCallback(
    (
      message: string,
      options: ShowAlertOptions = {}
    ) => {
      setAlert({
        message,
        variant: options.variant ?? "info",
      });

      setDuration(options.duration ?? 5000);
    },
    []
  );

  useEffect(() => {
    if (!alert || duration <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setAlert(null);
    }, duration);

    return () => {
      window.clearTimeout(timer);
    };
  }, [alert, duration]);

  return {
    alert,
    showAlert,
    closeAlert,
  };
}