// TestOption.ts
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from "typeorm";
import { TestQuestion } from "./TestQuestion";

@Entity()
export class TestOption {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  texto!: string;

  @Column({ default: false })
  esCorrecta!: boolean;

  @ManyToOne(() => TestQuestion)
  question!: TestQuestion;
}
