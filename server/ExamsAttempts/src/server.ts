import http from "http";
import { Server } from "socket.io";
import app from "./app";
import { SocketHandler } from "./websocket/SocketHandler";

const port = process.env.PORT || 3002;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  transports: ['websocket', 'polling'],
});

app.set("io", io);

const socketHandler = new SocketHandler(io);
app.set("socketHandler", socketHandler);

server.listen(port, () => {
  console.log(`Microservicio ExamsAttempts corriendo en http://localhost:${port}`);
});