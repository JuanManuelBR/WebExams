import { DataSource } from "typeorm";
import "reflect-metadata";

import { User } from "../models/User";

// Railway env vars
export const AppDataSource = new DataSource({
  type: "mysql",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "webexams",
  password: process.env.DB_PASS || "",
  port: parseInt(process.env.DB_PORT || "3306"),
  username: process.env.DB_USER || "root",
  synchronize: true,
  logging: false,
  entities: [User],
  ssl: {
    minVersion: "TLSv1.2",
    rejectUnauthorized: true,
  },
});
