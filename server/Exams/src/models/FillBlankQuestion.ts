// FillBlankQuestion.ts
import { ChildEntity, Column, OneToMany } from "typeorm";
import { Question } from "./Question";
import { BlankAnswer } from "./FillBlankAnswer";

@ChildEntity("fill")
export class FillBlankQuestion extends Question {
  @Column({ type: "text" })
  textoPreguntaEnBlanco!: string;

  @OneToMany(() => BlankAnswer, (b) => b.question, {
    cascade: true,
    eager: true,
  })
  respuestas!: BlankAnswer[];
}
