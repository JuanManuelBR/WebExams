import { IsNumber, IsString, IsOptional, IsEmail } from "class-validator";

export class StartExamAttemptDto {
  @IsString()
  codigo_examen!: string;

  @IsOptional()
  @IsString()
  nombre_estudiante?: string;

  @IsOptional()
  @IsEmail()
  correo_estudiante?: string;

  @IsOptional()
  @IsString()
  identificacion_estudiante?: string;

  @IsOptional()
  @IsString()
  contrasena?: string;
}