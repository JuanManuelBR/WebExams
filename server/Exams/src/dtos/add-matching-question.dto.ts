// add-matching-question.dto.ts
import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsString,
  IsOptional,
} from "class-validator";
import { Type } from "class-transformer";
import { BaseQuestionDto } from "./base-question.dto";
import { MatchPairDto } from "./add-match-pair.dto";
import { QuestionType } from "../types/Question";

export class MatchingQuestionDto extends BaseQuestionDto {
  type: QuestionType.MATCHING = QuestionType.MATCHING;

  @IsArray()
  @ArrayMinSize(2, {
    message: "Debes proporcionar al menos 2 pares para emparejar",
  })
  @ValidateNested({ each: true })
  @Type(() => MatchPairDto)
  pares!: MatchPairDto[];

}
