// TestQuestion.ts
import { Column, ChildEntity, OneToMany } from "typeorm";
import { Question } from "./Question";
import { TestOption } from "./TestOption";

@ChildEntity("test")
export class TestQuestion extends Question {
  @Column()
  shuffleOptions!: boolean;

  @OneToMany(() => TestOption, (option) => option.question, {
    onDelete: "CASCADE",
    eager: true,
    cascade: true
  })
  options!: TestOption[];

  @Column({type: "text"})
  nombreImagen ?: string;
}
