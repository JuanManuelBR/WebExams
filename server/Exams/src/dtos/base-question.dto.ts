import { QuestionType } from "../types/Question";
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";

// Se marca como abstracta
export abstract class BaseQuestionDto {
  @IsString({ message: "El enunciado debe ser una cadena de texto." })
  enunciado!: string;

  @IsNumber({}, { message: "El puntaje debe ser un número." })
  puntaje!: number;

  @IsIn(Object.values(QuestionType))
  type!: QuestionType;

  @IsBoolean({ message: "calificacionParcial debe ser booleano" })
  @IsNotEmpty({
    message:
      "Es obligatorio especificar si la calificación a la pregunta es parcial o completa",
  })
  calificacionParcial!: boolean;

  @IsString({ message: "El nombre de la imagen debe ser una cadena de texto" })
  @IsOptional()
  nombreImagen?: string;

  @IsNumber({}, { message: "El ID del examen debe ser un número." })
  @IsOptional()
  id_examen?: number;
}
