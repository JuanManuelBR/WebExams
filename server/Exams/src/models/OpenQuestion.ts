// OpenQuestion.ts
import { ChildEntity, Column } from "typeorm";
import { Question } from "./Question";

@ChildEntity("open")
export class OpenQuestion extends Question {
  @Column({ type: "text", nullable: true })
  respuestaCorrecta?: string;
}
