export const NOTIFICATION_UPDATED_EVENT =
  "notification:updated";

export function notifyNotificationUpdated() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new Event(NOTIFICATION_UPDATED_EVENT)
  );
}