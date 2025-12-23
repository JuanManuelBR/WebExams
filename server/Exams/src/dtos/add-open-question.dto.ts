import { QuestionType } from "@src/types/Question";
import { BaseQuestionDto } from "./base-question.dto";
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from "class-validator";

export class OpenQuestionDto extends BaseQuestionDto {
  type: QuestionType.OPEN = QuestionType.OPEN;

  @IsOptional()
  @IsString({ message: "El texto de respuesta debe ser una cadena de texto" })
  @ValidateIf((o) => !o.palabrasClave)
  textoRespuesta?: string;

  @IsOptional()
  @IsArray({ message: "Las palabras clave deben ser un arreglo" })
  @IsString({ each: true, message: "Cada palabra clave debe ser un texto" })
  @ValidateIf((o) => !o.textoRespuesta)
  palabrasClave?: string;

  @ValidateIf((o) => o.palabrasClave && o.palabrasClave.length > 0)
  @IsNotEmpty({
    message:
      "Si defines palabras clave, debes especificar si es obligatorio que la respuesta las contenga todas",
  })
  @IsBoolean({
    message: "El campo debeContenerTodasPalabrasClave debe ser booleano.",
  })
  debeContenerTodasPalabrasClave?: boolean;
}
