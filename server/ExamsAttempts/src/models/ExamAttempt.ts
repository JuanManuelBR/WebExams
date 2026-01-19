import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from "typeorm";

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
  exam_id!: number;

  @Column({ type: "text" })
  estado!: AttemptState;

  // Datos del estudiante
  @Column({ type: "text", nullable: true })
  nombre_estudiante?: string | null;

  @Column({ type: "text", nullable: true })
  correo?: string | null;

  @Column({ type: "text", nullable: true })
  identificacion?: string | null;

  @Column({ type: "varchar", length: 64, unique: true })
  codigo_intento!: string; // para reanudar manualmente

  @Column({ type: "varchar", length: 64, unique: true })
  session_id!: string; // para evitar 2 dispositivos

  @Column({ type: "double", nullable: true })
  puntaje?: number | null;

  @Column({ type: "double" })
  puntajeMaximo!: number;

  // Tiempo
  @Column({ type: "datetime" })
  fecha_inicio!: Date;

  @Column({ type: "datetime", nullable: true })
  fecha_fin!: Date | null;

  @Column({ type: "int", nullable: true })
  tiempo_limite_minutos!: number | null;

  // Control de trampas
  @Column({ type: "int", default: 0 })
  intentos_fraude!: number;

  @Column({ type: "boolean", default: false })
  bloqueado_por_fraude!: boolean;

  // Auditoría
  @CreateDateColumn({ type: "datetime" })
  created_at!: Date;
}
