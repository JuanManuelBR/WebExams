import {
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
  IsDate,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  IsNotEmpty,
  IsEmail,
} from "class-validator";
import { AttemptState } from "../models/ExamAttempt";

// Validar que almenos un campo de los datos dle estudiante esté presente
@ValidatorConstraint({ name: "AtLeastOneStudentField", async: false })
class AtLeastOneStudentField implements ValidatorConstraintInterface {
  validate(_: any, args: ValidationArguments) {
    const obj = args.object as any;
    return !!(
      obj.nombre_estudiante ||
      obj.correo_estudiante ||
      obj.identificacion_estudiante
    );
  }

  defaultMessage(args: ValidationArguments) {
    return "Debe haber al menos uno de estos campos: nombre_estudiante, correo_estudiante, identificacion_estudiante";
  }
}

export class CreateExamAttemptDto {
  @IsNumber()
  @IsNotEmpty({ message: "Falta examen_id" })
  examen_id!: number;

  @IsEnum(AttemptState)
  @IsNotEmpty({ message: "Falta el estado del examen" })
  estado!: AttemptState;

  @IsOptional()
  @IsString()
  nombre_estudiante?: string;

  @IsOptional()
  @IsEmail({},{message: "El correo electrónico no tiene formato válido"})
  correo_estudiante?: string;

  @IsOptional()
  @IsString()
  identificacion_estudiante?: string;

  @IsOptional()
  @IsNumber()
  puntaje?: number;

  @IsOptional()
  @IsNumber()
  progreso?: number;

  @IsNumber()
  @IsNotEmpty({ message: "Falta el puntaje máximo del examen" })
  puntajeMaximo!: number;


  @IsOptional()
  @IsDate()
  fecha_fin?: Date;

  @Validate(AtLeastOneStudentField)
  _dummy?: any; // Necesario para disparar la validación de clase
}
