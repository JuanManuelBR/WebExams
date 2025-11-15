import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("usuarios")
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 50 })
  primer_nombre!: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  segundo_nombre?: string;

  @Column({ type: "varchar", length: 50 })
  primer_apellido!: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  segundo_apellido?: string;


  @Column({ type: "varchar", length: 100, unique: true })
  email!: string;

  @Column({ type: "varchar", length: 100 })
  contrasena!: string;
}
