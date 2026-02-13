// src/types/Exam.ts

export enum ExamenState {
  OPEN = "open",
  CLOSED = "closed",
  ARCHIVED = "archivado",
}

export enum TiempoAgotado {
  ENVIAR = "enviar",
  DESCARTAR = "descartar",
}

export enum Consecuencia {
  NOTIFICAR = "notificar",
  BLOQUEAR = "bloquear",
  NINGUNA = "ninguna"
}

// ⭐ NUEVO: Enum para el modo de creación del examen
export enum ModoCreacionExamen {
  MANUAL = "manual",        // Crear preguntas manualmente
  PDF = "pdf"              // Usar archivo PDF
}