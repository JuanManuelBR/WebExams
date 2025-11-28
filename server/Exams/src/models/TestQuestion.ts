// TestQuestion.ts
import { Column, ChildEntity, OneToMany } from "typeorm";
import { Question } from "./Question";
import { TestOption } from "./TestOption";

@ChildEntity("test")
export class TestQuestion extends Question {
  @Column()
  shuffleOptions!: boolean;

  @OneToMany(() => TestOption, (option) => option.question, { cascade: true })
  options!: TestOption[];
}