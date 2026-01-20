import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { ExamInProgress } from "./ExamInProgress";
import { ExamAnswer } from "./ExamAnswer";
import { ExamEvent } from "./ExamEvent";

export enum AttemptState {
  ACTIVE = "activo",
  BLOCKED = "blocked",
  PAUSED = "paused",
  FINISHED = "finished",
}

@Entity("exam_attempts")
export class ExamAttempt {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  examen_id!: number;

  @Column({ type: "text" })
  estado!: AttemptState;

  @Column({ type: "text", nullable: true })
  nombre_estudiante?: string | null;

  @Column({ type: "text", nullable: true })
  correo_estudiante?: string | null;

  @Column({ type: "text", nullable: true })
  identificacion_estudiante?: string | null;

  @Column({ type: "double", nullable: true })
  puntaje?: number | null;

  @Column({ type: "double" })
  puntajeMaximo!: number;

  @Column({ type: "datetime" })
  fecha_inicio!: Date;

  @Column({ type: "datetime", nullable: true })
  fecha_fin?: Date | null;
  @Column({ type: "varchar", length: 50 })
  limiteTiempoCumplido!: string; // "enviar" o "descartar"

  @Column({ type: "varchar", length: 50 })
  consecuencia!: string; // "ninguna", "notificar", "bloquear"

  @OneToMany(() => ExamAnswer, (answer) => answer.intento, {
    cascade: true,
    eager: true,
  })
  respuestas?: ExamAnswer[];
}
