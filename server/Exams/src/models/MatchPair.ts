import { Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { MatchQuestion } from "./MatchQuestion";
import { MatchItemA } from "./MatchItemA";
import { MatchItemB } from "./MatchItemB";

@Entity()
export class MatchPair {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => MatchItemA)
  itemA!: MatchItemA;

  @ManyToOne(() => MatchItemB)
  itemB!: MatchItemB;

  @ManyToOne(() => MatchQuestion)
  question!: MatchQuestion;
}
