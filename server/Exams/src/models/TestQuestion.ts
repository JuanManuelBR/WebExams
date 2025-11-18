import { Entity, Column, OneToMany } from "typeorm";
import { Question } from "./Question";

@Entity()
export class TestQuestion extends Question {
  @Column()
  shuffleOptions!: boolean;
}
