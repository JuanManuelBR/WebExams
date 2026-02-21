// src/app.ts
import express from "express";
import cors from "cors";
import examRouter from "./routes/ExamRoutes"
//import UserRoutes from "./routes/UserRoutes";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middlewares/errorHandler";
import { setupSwagger } from "./config/swagger";

// Llamar express
const app = express();
app.use(cookieParser());
//importar express.json para poder manejar json
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173,http://localhost:3001")
  .split(",")
  .map((o) => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

// Configurar Swagger
setupSwagger(app);

app.use("/api/exam", examRouter);

app.use(errorHandler);

export default app;
