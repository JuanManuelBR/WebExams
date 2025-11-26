import { Question } from "@src/models/Question";

export enum ExamenState {
  OPEN = "open",
  CLOSED = "closed",
}


export interface add_exam_dto {
  nombre: string;
  clave: string;
  fecha_creacion: Date;
  estado: ExamenState;
  id_profesor: number;
  questions: Question[];
}
