import type { Server } from "socket.io";

type NotificationSocketGlobal = typeof globalThis & {
  notificationSocketServer?: Server;
};

const notificationGlobal = globalThis as NotificationSocketGlobal;

export function setNotificationSocketServer(server: Server) {
  notificationGlobal.notificationSocketServer = server;
}

export function publishNotificationUpdate({
  userId,
  notifyAdmins = false,
}: {
  userId?: number;
  notifyAdmins?: boolean;
}) {
  const server = notificationGlobal.notificationSocketServer;

  if (!server) {
    return;
  }

  if (userId !== undefined) {
    server.to(`user:${userId}`).emit("notification:updated");
  }

  if (notifyAdmins) {
    server.to("admins").emit("notification:updated");
  }
}
