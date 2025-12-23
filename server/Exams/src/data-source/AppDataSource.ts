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
import { Question } from "@src/models/Question";
import { Exam } from "@src/models/Exam";
import { TestQuestion } from "@src/models/TestQuestion";
import { TestOption } from "@src/models/TestOption";

import { BlankAnswer } from "@src/models/FillBlankAnswer";
import { FillBlankQuestion } from "@src/models/FillBlankQuestion";

import { OpenQuestion } from "@src/models/OpenQuestion";

import { MatchQuestion } from "@src/models/MatchQuestion";

import { MatchItemA } from "@src/models/MatchItemA";
import { MatchItemB } from "@src/models/MatchItemB";
import { MatchPair } from "@src/models/MatchPair";
import { OpenQuestionKeyword } from "@src/models/OpenQuestionKeyWord";

// crear el AppDataSource (Conexión BD)
export const AppDataSource = new DataSource({
  type: "mysql",
  host: DB_HOST,
  database: DB_NAME,
  password: DB_PASS,
  port: DB_PORT,
  username: DB_USER,
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
});
