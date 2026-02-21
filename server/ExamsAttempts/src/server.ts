import http from "http";
import { Server } from "socket.io";
import app from "./app";
import { SocketHandler } from "./websocket/SocketHandler";
import { AppDataSource } from "./data-source/AppDataSource";

const port = process.env.PORT || 3002;

const server = http.createServer(app);

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173,http://localhost:3001")
  .split(",")
  .map((o) => o.trim());

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

app.set("io", io);

AppDataSource.initialize()
  .then(() => {
    console.log("Base de datos conectada correctamente");

    const socketHandler = new SocketHandler(io);
    app.set("socketHandler", socketHandler);

    server.listen(port, () => {
      console.log(`Microservicio ExamsAttempts corriendo en http://localhost:${port}`);
    });
  })
  .catch((err: unknown) => {
    console.error("No se pudo conectar a la BD:", err);
    process.exit(1);
  });