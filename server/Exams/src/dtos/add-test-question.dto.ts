// test-question.dto.ts
import {
  ValidateNested,
  IsBoolean,
  IsArray,
  IsNotEmpty,
  IsString,
  IsOptional,
} from "class-validator";
import { Type } from "class-transformer";
import { BaseQuestionDto } from "./base-question.dto";
import { TestOptionDto } from "./test-option.dto";
import { QuestionType } from "@src/types/Question";

export class TestQuestionDto extends BaseQuestionDto {
  type: QuestionType.TEST = QuestionType.TEST;

  @IsBoolean({ message: "El campo 'shuffleOptions' debe ser booleano" })
  @IsNotEmpty({ message: "El campo 'shuffleOptions' es obligatorio" })
  shuffleOptions!: boolean;

  @IsArray({ message: "Las opciones deben ser un array" })
  @ValidateNested({
    each: true,
    message: "Las opciones de la pregunta deben ser válidas",
  })
  @Type(() => TestOptionDto)
  @IsNotEmpty({ message: "Debe proporcionar al menos una opción" })
  options!: TestOptionDto[];

  @IsString({ message: "El nombre de la imagen debe ser una cadena de texto" })
  @IsOptional()
  nombreImagen?: string;
}
