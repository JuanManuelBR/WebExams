import { QuestionType } from "../types/Question";
import { BaseQuestionDto } from "./base-question.dto";
import {
  IsArray,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { OpenQuestionKeywordDto } from "./openQuestion-keyword.dto";

export class OpenQuestionDto extends BaseQuestionDto {
  type: QuestionType.OPEN = QuestionType.OPEN;

  @IsOptional()
  @IsString({ message: "El texto de respuesta debe ser una cadena de texto" })
  @ValidateIf((o) => !o.palabrasClave)
  textoRespuesta?: string;

  @IsOptional()
  @IsArray({ message: "Las palabras clave deben ser un arreglo" })
  @ValidateNested({ each: true })
  @Type(() => OpenQuestionKeywordDto)
  @ValidateIf((o) => !o.textoRespuesta)
  palabrasClave?: string;

}
