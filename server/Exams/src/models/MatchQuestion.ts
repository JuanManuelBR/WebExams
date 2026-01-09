import { ChildEntity, Column, OneToMany } from "typeorm";
import { Question } from "./Question";
import { MatchPair } from "./MatchPair";

@ChildEntity("match")
export class MatchQuestion extends Question {
  @OneToMany(() => MatchPair, (pair) => pair.question, {
    cascade: true,
    onDelete: "CASCADE",
  })
  pares!: MatchPair[];

  @Column({type: "text"})
  nombreImagen ?: string;
}
