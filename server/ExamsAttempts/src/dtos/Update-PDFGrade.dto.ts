import { IsNumber, IsString, IsOptional, Min, Max } from "class-validator";

export class UpdatePDFGradeDto {
  @IsOptional()
  @IsNumber({}, { message: "El puntaje debe ser un número" })
  @Min(0, { message: "El puntaje no puede ser negativo" })
  @Max(5, { message: "El puntaje no puede exceder 5" })
  puntaje?: number;

  @IsOptional()
  @IsString({ message: "La retroalimentación debe ser texto" })
  retroalimentacion?: string;
}
