import { createServer } from "node:http";

import next from "next";
import { Server } from "socket.io";

import { setNotificationSocketServer } from "./src/lib/notifications/socket-server";
import { verifyNotificationSocketToken } from "./src/lib/notifications/socket-token";

async function startServer() {
  const dev = process.env.NODE_ENV !== "production";
  const hostname = process.env.HOSTNAME ?? "localhost";
  const port = Number(process.env.PORT ?? 3000);
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();

  await app.prepare();

  const httpServer = createServer((request, response) => {
    void handle(request, response);
  });
  const io = new Server(httpServer, {
    path: "/socket.io",
    transports: ["websocket"],
  });

  setNotificationSocketServer(io);

  io.use((socket, nextSocket) => {
    const token = socket.handshake.auth?.token;
    const claims =
      typeof token === "string" ? verifyNotificationSocketToken(token) : null;

    if (!claims) {
      nextSocket(new Error("Unauthorized notification socket."));
      return;
    }

    socket.data.notificationClaims = claims;
    nextSocket();
  });

  io.on("connection", (socket) => {
    const claims = socket.data.notificationClaims as {
      userId: number;
      role: "USER" | "ADMIN";
    };

    if (claims.role === "ADMIN") {
      void socket.join("admins");
    } else {
      void socket.join(`user:${claims.userId}`);
    }
  });

  httpServer.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
}

void startServer().catch((error) => {
  console.error("Unable to start the development server:", error);
  process.exit(1);
});
