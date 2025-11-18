import { Entity, Column, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { MatchQuestion } from "./MatchQuestion";

@Entity()
export class MatchItemB {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  text!: string;

  @ManyToOne(() => MatchQuestion)
  question!: MatchQuestion;
}
