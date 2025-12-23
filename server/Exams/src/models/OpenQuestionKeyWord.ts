import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class OpenQuestionKeyword {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  texto!: string;

  @Column({ type: "boolean"})
  esObligatoria!: boolean; 

  @ManyToOne("OpenQuestion", "keywords", { onDelete: "CASCADE" })
  question!: any;
}
