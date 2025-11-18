import {
  Entity,
  TableInheritance,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
} from "typeorm";
import { Exam } from "./Exam";

@Entity()
@TableInheritance({ column: { type: "varchar", name: "type" } })
export abstract class Question {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  enunciado!: string;

  @Column({ type: "float", default: 1 })
  puntaje!: number;

  @ManyToOne(() => Exam)
  exam!: Exam;
}
