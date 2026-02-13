// src/app.ts
import express from "express";
import { AppDataSource } from "./data-source/AppDataSource";
import cors from "cors";
import examRouter from "@src/routes/ExamRoutes"
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

app.use(cors({
  origin: '*', // o el puerto donde corre tu HTML
  credentials: true
}));

// Configurar Swagger
setupSwagger(app);

app.use("/api/exam", examRouter);

app.use(errorHandler);

AppDataSource.initialize()
  .then(async () => {
    console.log("Base de datos conectada correctamente");
  })
  .catch((err: unknown) => console.error("No se pudo conectar a la Bd", err));

export default app;
