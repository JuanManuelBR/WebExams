import express from "express";
import { AppDataSource } from "./data-source/AppDataSource";
import cors from "cors";

import UserRoutes from "./routes/UserRoutes";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middlewares/errorHandler";

const app = express();

const whitelist = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:3001",
];

const corsOptions = {
  origin: (origin: any, callback: any) => {
    // Permitir peticiones sin origin (proxy)
    if (!origin || whitelist.includes(origin)) {
      callback(null, true);
    } else {
      console.warn("Intento de acceso desde origen no permitido:", origin);
      callback(new Error("CORS bloqueado: Origen no permitido"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(cookieParser());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use("/api/users", UserRoutes);

app.use(errorHandler);

AppDataSource.initialize()
  .then(() => console.log("Base de datos conectada correctamente"))
  .catch((err) => console.error("No se pudo conectar a la Bd", err));

export default app;