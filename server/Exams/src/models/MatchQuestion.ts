import { ChildEntity, Column } from "typeorm";
import { Question } from "./Question";

@ChildEntity("match")
export class MatchQuestion extends Question {


}
