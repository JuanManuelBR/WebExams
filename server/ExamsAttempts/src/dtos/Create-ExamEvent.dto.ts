import { IsEnum, IsOptional, IsDate, IsNumber, IsNotEmpty } from "class-validator";
import { Type } from "class-transformer";
import { AttemptEvent } from "../models/ExamEvent";

export class CreateExamEventDto {
  @IsEnum(AttemptEvent, { message: "tipo_evento debe ser un valor válido" })
  @IsNotEmpty({message: "Falta el tipo de evento"})
  tipo_evento!: AttemptEvent;

  @Type(() => Date)
  @IsDate({ message: "fecha_envio debe ser una fecha válida" })
  @IsNotEmpty({message: "Falta la fecha de envío del evento"})
  fecha_envio!: Date;

  @IsNumber({}, { message: "El ID del intento debe ser un número" })
  @IsNotEmpty({message: "Falta el ID del intento"})
  intento_id!: number;
}
