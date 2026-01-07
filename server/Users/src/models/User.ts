// ============================================
// 📁 BACKEND/src/models/User.ts
// CÓDIGO COMPLETO
// ============================================

import { 
  Column, 
  Entity, 
  PrimaryGeneratedColumn,
  CreateDateColumn
} from "typeorm";

@Entity("usuarios")
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ 
    type: "varchar", 
    length: 128, 
    unique: true, 
    nullable: true 
  })
  firebase_uid!: string | null;

  @Column({ type: "varchar", length: 100 })
  nombres!: string;

  @Column({ type: "varchar", length: 100 })
  apellidos!: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  contrasena!: string | null;

  @Column({ 
    type: "enum", 
    enum: ["email", "google"],
    default: "email"
  })
  login_method!: "email" | "google";

  @Column({ type: "varchar", length: 500, nullable: true })
  foto_perfil!: string | null;

  @Column({ type: "boolean", default: false })
  email_verificado!: boolean;

  @Column({ type: "boolean", default: true })
  activo!: boolean;

  @CreateDateColumn()
  fecha_creacion!: Date;

  @Column({ type: "timestamp", nullable: true })
  ultimo_acceso!: Date | null;
}