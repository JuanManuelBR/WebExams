// FillBlankQuestion.ts
import { ChildEntity, Column, OneToMany } from "typeorm";
import { Question } from "./Question";
import { BlankAnswer } from "./FillBlankAnswer";

@ChildEntity("fill_blanks")
export class FillBlankQuestion extends Question {
  @Column({ type: "text" })
  textoCorrecto!: string;

  @OneToMany(() => BlankAnswer, (b) => b.question, {
    cascade: true,
    eager: true,
  })
  respuestas!: BlankAnswer[];

  @Column({type: "text"})
  nombreImagen ?: string;
}
