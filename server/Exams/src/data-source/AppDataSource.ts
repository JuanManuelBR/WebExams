import { DataSource } from "typeorm";
import "reflect-metadata";

import { Question } from "../models/Question";
import { Exam } from "../models/Exam";
import { TestQuestion } from "../models/TestQuestion";
import { TestOption } from "../models/TestOption";

import { BlankAnswer } from "../models/FillBlankAnswer";
import { FillBlankQuestion } from "../models/FillBlankQuestion";

import { OpenQuestion } from "../models/OpenQuestion";

import { MatchQuestion } from "../models/MatchQuestion";

import { MatchItemA } from "../models/MatchItemA";
import { MatchItemB } from "../models/MatchItemB";
import { MatchPair } from "../models/MatchPair";
import { OpenQuestionKeyword } from "../models/OpenQuestionKeyWord";

// crear el AppDataSource (Conexión BD)
export const AppDataSource = new DataSource({
  type: "mysql",
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  synchronize: true,
  logging: false,
  entities: [
    Exam,
    Question,
    TestQuestion,
    OpenQuestion,
    FillBlankQuestion,
    MatchQuestion,
    TestOption,
    BlankAnswer,
    MatchItemA,
    MatchItemB,
    MatchPair,
    OpenQuestionKeyword,
  ],
  migrations: ["src/migrations/*.ts"],
  migrationsTableName: "migrations",
  ssl: {
    minVersion: "TLSv1.2",
    rejectUnauthorized: true,
  },
  connectTimeout: 30000,
  extra: {
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    connectionLimit: 10,
    connectTimeout: 30000,
    waitForConnections: true,
    queueLimit: 0,
  },
});
