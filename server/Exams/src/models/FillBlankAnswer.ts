// BlankAnswer.ts
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from "typeorm";
import { FillBlankQuestion } from "./FillBlankQuestion";

@Entity()
export class BlankAnswer {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  posicion!: number; // en qué {{}} va

  @Column()
  textoCorrecto!: string;

  @ManyToOne(() => FillBlankQuestion)
  question!: FillBlankQuestion;
}
