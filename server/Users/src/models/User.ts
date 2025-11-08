import { tipo_usuario } from "@src/types/user";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("usuarios")
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "string", length: 50 })
  primer_nombre!: string;

  @Column({ type: "string", length: 50 })
  segundo_nombre?: string;

  @Column({ type: "string", length: 50 })
  primer_apellido?: string;

  @Column({ type: "string", length: 50 })
  segundo_apellido?: string;

  @Column({ type: "enum" })
  tipo!: tipo_usuario;

  @Column({ type: "string", length: 100 })
  email!: string;

  @Column({ type: "string", length: 100 })
  contrasena!: string;
}
