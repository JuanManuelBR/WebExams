import { IsNumber, IsString, IsDate, IsNotEmpty, IsOptional } from "class-validator";
import { Type } from "class-transformer";

export class CreateExamAnswerDto {
  @IsNumber({}, {})
  @IsNotEmpty({message: "Falta el id de la pregunta"})
  pregunta_id!: number;

  @IsString()
  @IsNotEmpty({message: "Falta la respuesta de la pregunta"})
  respuesta!: string;

  @Type(() => Date)
  @IsDate({ message: "La fecha de respuesta debe ser válida" })
  @IsNotEmpty({message: "Falta la fecha de respuesta"})
  fecha_respuesta!: Date;

  @IsNumber({}, {})
  @IsNotEmpty({message: "Falta el id del intento"})
  intento_id!: number;

  @IsOptional()
  @IsString()
  retroalimentacion?: string;
}
