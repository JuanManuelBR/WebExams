// OpenQuestion.ts
import { ChildEntity, Column, OneToMany } from "typeorm";
import { Question } from "./Question";
import { OpenQuestionKeyword } from "./OpenQuestionKeyWord";

@ChildEntity("open")
export class OpenQuestion extends Question {

  
  @Column({ type: "text", nullable: true })
  textoRespuesta?: string;


  @OneToMany(() => OpenQuestionKeyword, (keyword) => keyword.question, {
    cascade: true,
    eager: true,
    onDelete: "CASCADE",
  })
  keywords?: OpenQuestionKeyword[];

  @Column({type: "text"})
  nombreImagen ?: string;
}
