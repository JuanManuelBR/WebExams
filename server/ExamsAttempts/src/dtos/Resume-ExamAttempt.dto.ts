import { IsString } from "class-validator";

export class ResumeExamAttemptDto {
  @IsString()
  codigo_acceso!: string;

  @IsString()
  id_sesion!: string;
}