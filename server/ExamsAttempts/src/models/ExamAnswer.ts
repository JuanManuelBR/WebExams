import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import type { ExamAttempt } from "./ExamAttempt";

@Entity("exam_answers")
export class ExamAnswer {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  pregunta_id!: number;

  @Column({ type: "text" })
  respuesta!: string;

  @Column({ type: "datetime" })
  fecha_respuesta!: Date;

  @Column()
  intento_id!: number;

  @ManyToOne("ExamAttempt", "respuestas")
  @JoinColumn({ name: "intento_id" })
  intento!: ExamAttempt;
}
