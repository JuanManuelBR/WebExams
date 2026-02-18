import { IsString, IsOptional } from "class-validator";

export class ResumeExamAttemptDto {
  @IsString()
  codigo_acceso!: string;

  @IsOptional()
  @IsString()
  id_sesion?: string;
}