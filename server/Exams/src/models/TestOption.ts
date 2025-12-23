// TestOption.ts
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from "typeorm";
import type { TestQuestion } from "./TestQuestion";

@Entity()
export class TestOption {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  texto!: string;

  @Column({ default: false })
  esCorrecta!: boolean;

  @ManyToOne("TestQuestion", "options", { onDelete: "CASCADE" })
  question!: TestQuestion;
}
