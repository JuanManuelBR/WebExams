import http from "http";
import { Server } from "socket.io";
import app from "./app";
import { SocketHandler } from "./websocket/SocketHandler";

const port = process.env.PORT || 3000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.set("io", io);

// Inicializar manejador de WebSocket
const socketHandler = new SocketHandler(io);
app.set("socketHandler", socketHandler);

server.listen(port, () => {
  console.log(`Microservicio ExamsAttempts corriendo en http://localhost:${port}`);
});