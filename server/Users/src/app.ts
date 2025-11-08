import express from "express";
import { AppDataSource } from "./data-source/AppDataSource";
import { json } from "stream/consumers";

// Llamar express
const app = express();

//importar express.json para poder manejar json
app.use(express.json);

AppDataSource.initialize()

  .then(() => console.log("Base de datos conectada correctamente"))
  .catch((err) => console.error("No se pudo conectar a la Bd", err));

export default app;
