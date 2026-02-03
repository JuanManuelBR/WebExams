export interface TestQuestion {
  id: number;
  puntaje: number;
  calificacionParcial: boolean;
  options: Array<{
    id: number;
    texto: string;
    esCorrecta: boolean;
  }>;
}


export interface StudentAnswer {
  pregunta_id: number;
  respuesta: string; // JSON string con array de IDs
}