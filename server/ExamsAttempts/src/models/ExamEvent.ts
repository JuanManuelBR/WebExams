import { Column, Entity, PrimaryGeneratedColumn, OneToOne, JoinColumn } from "typeorm";
import type { ExamAttempt } from "./ExamAttempt";

export enum AttemptEvent {
  INTENTO_INICIADO = "intento_iniciado",
  INTENTO_FINALIZADO = "intento_finalizado",
  PANTALLA_COMPLETA_CERRADA = "pantalla_completa_cerrada",
  COMBINACION_TECLAS_PROHIBIDA = "combinacion_teclas_prohibida",
  FOCO_PERDIDO = "foco_perdido",
  INTENTO_COPIAR_PEGAR_IMPRIMIR = "intento_copiar_pegar_imprimir",
  MANIPULACION_CODIGO = "manipulacion_codigo",
  PESTAÑA_CAMBIADA = "pestaña_Cambiada",
}

@Entity("exam_events")
export class ExamEvent {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "text" })
  tipo_evento!: AttemptEvent;

  @Column({ type: "datetime", nullable: true })
  fecha_envio?: Date | null;

  @OneToOne("ExamAttempt", "examenes_en_curso")
  @JoinColumn({ name: "intento_id" })
  intento!: ExamAttempt;
}
