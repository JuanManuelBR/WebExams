import express from "express";
import { AppDataSource } from "./data-source/AppDataSource";
import cors from "cors";
import ExamRoutes from "./routes/ExamRoutes";
//import UserRoutes from "./routes/UserRoutes";
import cookieParser from "cookie-parser";


// Llamar express
const app = express();
app.use(cookieParser());
//importar express.json para poder manejar json
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());

app.use("/api/exams", ExamRoutes);

AppDataSource.initialize()

  .then(() => console.log("Base de datos conectada correctamente"))
  .catch((err: unknown) => console.error("No se pudo conectar a la Bd", err));

export default app;
