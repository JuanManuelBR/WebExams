import { IsNumber, IsEnum, IsDate, IsOptional, IsString, IsNotEmpty } from "class-validator";
import { Type } from "class-transformer";
import { AttemptState } from "../models/ExamInProgress";

export class CreateExamInProgressDto {
  @IsString()
  @IsNotEmpty({message: "Falta el código de acceso"})
  codigo_acceso!: string;

  @IsEnum(AttemptState, { message: "estado debe ser un valor válido" })
  @IsNotEmpty({message: "Falta el estado del intento"})
  estado!: AttemptState;

  @Type(() => Date)
  @IsDate({ message: "fecha_inicio debe ser una fecha válida" })
  @IsNotEmpty({message: "Falta la fecha de inicio"})
  fecha_inicio!: Date;

  @Type(() => Date)
  @IsOptional()
  @IsDate({ message: "fecha_fin debe ser una fecha válida" })
  fecha_fin?: Date | null;

  @IsOptional()
  @IsString({ message: "id_sesion debe ser un string válido" })
  id_sesion?: string;

  @Type(() => Date)
  @IsOptional()
  @IsDate({ message: "fecha_expiracion debe ser una fecha válida" })
  fecha_expiracion?: Date | null;

  @IsNumber({}, {})
  @IsNotEmpty({message: "Falta el ID del intento"})
  intento_id!: number;
}
