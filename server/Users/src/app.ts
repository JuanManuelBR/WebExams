import express from "express";
import { AppDataSource } from "./data-source/AppDataSource";
import cors from "cors";

import UserRoutes from "./routes/UserRoutes";

// Llamar express
const app = express();

//importar express.json para poder manejar json
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());

app.use("/api/users", UserRoutes);
AppDataSource.initialize()

  .then(() => console.log("Base de datos conectada correctamente"))
  .catch((err) => console.error("No se pudo conectar a la Bd", err));

export default app;
