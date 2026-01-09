// test-option.dto.ts
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class OpenQuestionKeywordDto {
  @IsOptional()
  @IsNumber({}, { message: "El id debe ser numérico." })
  id?: number;

  @IsString({ message: "Palabra clave debe ser un string" })
  texto!: string;

  @IsOptional()
  @IsNumber({}, { message: "El questionId debe ser numérico." })
  questionId?: number;
}
