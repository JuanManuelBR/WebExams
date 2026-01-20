import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
} from "typeorm";
import type { ExamAttempt } from "./ExamAttempt";

export enum AttemptState {
  ACTIVE = "activo",
  BLOCKED = "blocked",
  PAUSED = "paused",
  FINISHED = "finished",
}

@Entity("exams_in_progress")
export class ExamInProgress {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", unique: true, length: 10  })
  codigo_acceso!: string;

  @Column({ type: "text" })
  estado!: AttemptState;

  @Column({ type: "datetime" })
  fecha_inicio!: Date;

  @Column({ type: "datetime", nullable: true })
  fecha_fin?: Date | null;

  @Column({ type: "varchar", unique: true, length: 10  })
  id_sesion!: string;

  @Column({ type: "datetime", nullable: true })
  fecha_expiracion?: Date | null;

  @Column()
  intento_id!: number;

  @OneToOne("ExamAttempt", "examenes_en_curso")
  @JoinColumn({ name: "intento_id" })
  intento!: ExamAttempt;
}

  

