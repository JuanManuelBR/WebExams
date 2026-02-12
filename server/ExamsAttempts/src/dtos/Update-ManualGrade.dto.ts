import { IsNumber, IsString, IsOptional, Min, Max } from "class-validator";

export class UpdateManualGradeDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  puntaje?: number;

  @IsOptional()
  @IsString()
  retroalimentacion?: string;
}
