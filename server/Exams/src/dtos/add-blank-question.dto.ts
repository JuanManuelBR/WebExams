import {
  IsArray,
  IsNotEmpty,
  IsString,
  ValidateNested,
  IsEnum,
  IsOptional,
} from "class-validator";
import { Type } from "class-transformer";
import { FillBlankAnswerDto } from "./add-fill-blank-answer.dto";
import { BaseQuestionDto } from "./base-question.dto";
import { QuestionType } from "@src/types/Question";

export class FillBlankQuestionDto extends BaseQuestionDto {
  // 1. Forzar el valor del discriminador con el Enum
  @IsEnum(QuestionType)
  type: QuestionType.FILL_BLANKS = QuestionType.FILL_BLANKS;

  @IsString({ message: "El texto de la pregunta es obligatorio." })
  @IsNotEmpty()
  textoCorrecto!: string;

  @IsString({ message: "El nombre de la imagen debe ser una cadena de texto" })
  @IsOptional()
  nombreImagen?: string;

  @IsArray({ message: "Las respuestas deben ser un arreglo." })
  @ValidateNested({ each: true })
  @Type(() => FillBlankAnswerDto)
  respuestas!: FillBlankAnswerDto[];
}
