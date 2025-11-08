import { DataSource } from "typeorm";
import "reflect-metadata";

// importar datos del .env
import {
  DB_HOST,
  DB_NAME,
  DB_PASS,
  DB_PORT,
  DB_USER,
} from "../../config/config";
import { User } from "@src/models/User";


// crear el AppDataSource (Conexión BD)
export const AppDataSource = new DataSource({
  type: "mysql",
  host: DB_HOST,
  name: DB_NAME,
  password: DB_PASS,
  port: DB_PORT,
  username: DB_USER,
  synchronize: true,
  logging: true,
  entities: [User],
});
