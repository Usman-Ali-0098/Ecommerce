"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import {
  CheckCircle2,
  Clock3,
  PackageCheck,
  PackageX,
  Truck,
} from "lucide-react";

import Alert from "@/components/ui/alert";
import Button from "@/components/ui/button";

import { useAlert } from "@/hooks/use-alert";

type OrderStatus =
  "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";

type Props = {
  orderId: string;

  currentStatus: OrderStatus;
};

const allowedNextStatuses: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["PROCESSING"],

  PROCESSING: ["SHIPPED"],

  SHIPPED: ["DELIVERED"],

  DELIVERED: [],

  CANCELLED: [],
};

function formatStatus(status: string) {
  return status.toLowerCase().replace(/^\w/, (value) => value.toUpperCase());
}

export default function AdminOrderStatus({ orderId, currentStatus }: Props) {
  const router = useRouter();

  const { alert, showAlert, closeAlert } = useAlert();

  const options = allowedNextStatuses[currentStatus];

  const [status, setStatus] = useState<OrderStatus | "">("");

  const [isUpdating, setIsUpdating] = useState(false);

  async function updateStatus() {
    if (!status) {
      showAlert("Please select a new order status.", { variant: "warning" });

      return;
    }

    try {
      setIsUpdating(true);

      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          status,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        showAlert(result.message ?? "Unable to update order.", {
          variant: "error",
        });

        return;
      }

      showAlert(result.message ?? "Order updated successfully.", {
        variant: "success",
      });

      setStatus("");

      router.refresh();
    } catch (error) {
      console.error("Admin order status error:", error);

      showAlert("Something went wrong while updating the order.", {
        variant: "error",
      });
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <>
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm shadow-gray-100/50">
        {/* Header */}

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Order Status
            </h2>

            <p className="mt-0.5 text-[10px] text-gray-400">
              Manage order progress.
            </p>
          </div>

          <StatusIcon status={currentStatus} />
        </div>

        {/* Current */}

        <div className="mt-4">
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
            Current Status
          </p>

          <div className="mt-2">
            <StatusBadge status={currentStatus} />
          </div>
        </div>

        {/* Change */}

        {options.length > 0 ? (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <label className="mb-1.5 block text-xs font-medium text-gray-700">
              Change Status
            </label>

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as OrderStatus)}
              className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Select status</option>

              {options.map((option) => (
                <option key={option} value={option}>
                  {formatStatus(option)}
                </option>
              ))}
            </select>

            <div className="mt-3">
              <Button
                type="button"
                onClick={updateStatus}
                disabled={isUpdating || !status}
              >
                {isUpdating ? "Updating..." : "Update Status"}
              </Button>
            </div>

          </div>
        ) : (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="text-[11px] leading-4 text-gray-500">
              This order has reached a final status and cannot be changed.
            </p>
          </div>
        )}
      </div>

      {alert ? (
        <Alert
          message={alert.message}
          variant={alert.variant}
          onClose={closeAlert}
        />
      ) : null}
    </>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const styles = getStatusStyles(status);

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-medium ${styles.container}`}
    >
      <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${styles.dot}`} />

      {formatStatus(status)}
    </span>
  );
}

function StatusIcon({ status }: { status: OrderStatus }) {
  const iconClass = "h-4 w-4";

  const wrapper = "flex h-8 w-8 items-center justify-center rounded-lg";

  switch (status) {
    case "PENDING":
      return (
        <div className={`${wrapper} bg-amber-50 text-amber-600`}>
          <Clock3 className={iconClass} />
        </div>
      );

    case "PROCESSING":
      return (
        <div className={`${wrapper} bg-blue-50 text-blue-600`}>
          <PackageCheck className={iconClass} />
        </div>
      );

    case "SHIPPED":
      return (
        <div className={`${wrapper} bg-violet-50 text-violet-600`}>
          <Truck className={iconClass} />
        </div>
      );

    case "DELIVERED":
      return (
        <div className={`${wrapper} bg-green-50 text-green-600`}>
          <CheckCircle2 className={iconClass} />
        </div>
      );

    case "CANCELLED":
      return (
        <div className={`${wrapper} bg-red-50 text-red-600`}>
          <PackageX className={iconClass} />
        </div>
      );
  }
}

function getStatusStyles(status: OrderStatus) {
  switch (status) {
    case "PENDING":
      return {
        container: "bg-amber-50 text-amber-700",

        dot: "bg-amber-500",
      };

    case "PROCESSING":
      return {
        container: "bg-blue-50 text-blue-700",

        dot: "bg-blue-500",
      };

    case "SHIPPED":
      return {
        container: "bg-violet-50 text-violet-700",

        dot: "bg-violet-500",
      };

    case "DELIVERED":
      return {
        container: "bg-green-50 text-green-700",

        dot: "bg-green-500",
      };

    case "CANCELLED":
      return {
        container: "bg-red-50 text-red-700",

        dot: "bg-red-500",
      };
  }
}
