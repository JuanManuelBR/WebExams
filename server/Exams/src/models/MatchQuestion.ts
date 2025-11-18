import { ChildEntity, Column } from "typeorm";
import { Question } from "./Question";
import { MatchPair } from "./MatchPair";

@ChildEntity("match")
export class MatchQuestion extends Question {


}
