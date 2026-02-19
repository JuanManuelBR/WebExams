import { DataSource } from "typeorm";
import "reflect-metadata";

import { ExamAttempt } from "../models/ExamAttempt";
import { ExamAnswer } from "../models/ExamAnswer";
import { ExamInProgress } from "../models/ExamInProgress";
import { ExamEvent } from "../models/ExamEvent";
export const AppDataSource = new DataSource({
  type: "mysql",
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  synchronize: true,
  logging: false,
  entities: [ExamAttempt, ExamAnswer, ExamEvent, ExamInProgress],
  migrations: [],
  migrationsTableName: "migrations",
  ssl: {
    minVersion: "TLSv1.2",
    rejectUnauthorized: true,
  },
  connectTimeout: 30000,
  extra: {
    // Mantiene las conexiones del pool vivas para evitar ECONNRESET en TiDB Cloud
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    connectionLimit: 10,
    connectTimeout: 30000,
    waitForConnections: true,
    queueLimit: 0,
  },
});
