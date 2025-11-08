import { tipo_usuario } from "@src/types/user";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("usuarios")
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 50 })
  primer_nombre!: string;

  @Column({ type: "varchar", length: 50 })
  segundo_nombre?: string;

  @Column({ type: "varchar", length: 50 })
  primer_apellido?: string;

  @Column({ type: "varchar", length: 50 })
  segundo_apellido?: string;

  @Column({ type: "enum", enum: tipo_usuario })
  tipo!: tipo_usuario;

  @Column({ type: "varchar", length: 100 })
  email!: string;

  @Column({ type: "varchar", length: 100 })
  contrasena!: string;
}
