// ============================================
// 📁 BACKEND/src/services/UserService.ts
// CÓDIGO COMPLETO CON ESTADO ACTIVO
// ============================================

import { AppDataSource } from "@src/data-source/AppDataSource";
import { User } from "@src/models/User";
import axios from "axios";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { throwHttpError } from "@src/utils/errors";
import { AddUserDto } from "@src/dtos/Add-user.dto";
import { CommonValidator } from "@src/validators/common";
import { EditUserDto } from "@src/dtos/Edit-user.dto";
import { firebaseAdmin } from "@src/firebase-admin";

const EXAMS_MS_URL = process.env.EXAMS_MS_URL;
const JWT_SECRET = process.env.JWT_SECRET!;

export class UserService {
  private user_repository = AppDataSource.getRepository(User);

  async login(email: string, contrasena: string) {
    if (!email || !contrasena) {
      throw new Error("Por favor ingrese Correo y contraseña");
    }

    const usuario = await this.user_repository.findOne({
      where: { email },
    });

    if (!usuario) {
      throw new Error("No se encontró un usuario con ese correo");
    }

    // Rechazar usuarios de Google en el login con contraseña
    if (usuario.login_method === 'google') {
      throw new Error("Este usuario está registrado con Google. Por favor inicia sesión con Google.");
    }

    // Para usuarios de email, validar contraseña
    if (!usuario.contrasena) {
      throw new Error("Este usuario debe iniciar sesión con Google");
    }

    const contrasena_valida = await bcrypt.compare(
      contrasena,
      usuario.contrasena
    );

    if (!contrasena_valida) {
      throw new Error("Contraseña incorrecta");
    }

    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET no está configurado");
    }

    const payload = {
      id: usuario.id,
      email: usuario.email,
      nombres: usuario.nombres,
      apellidos: usuario.apellidos
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

    // Actualizar último acceso (activo se actualiza en el controller)
    await this.user_repository.update(usuario.id, {
      ultimo_acceso: new Date()
    });

    return {
      message: "Login exitoso",
      token,
      usuario: payload,
    };
  }

  async loginWithFirebaseToken(firebaseIdToken: string) {
    if (!firebaseIdToken) {
      throw new Error("Token de Firebase requerido");
    }

    // Verificar el token con Firebase Admin
    let decodedToken;
    try {
      decodedToken = await firebaseAdmin.auth().verifyIdToken(firebaseIdToken);
    } catch (error: any) {
      throw new Error("Token de Firebase inválido o expirado");
    }

    const email = decodedToken.email;
    if (!email) {
      throw new Error("El token de Firebase no contiene un email");
    }

    const usuario = await this.user_repository.findOne({
      where: { email },
    });

    if (!usuario) {
      throw new Error("No se encontró un usuario con ese correo. Regístrate primero.");
    }

    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET no está configurado");
    }

    const payload = {
      id: usuario.id,
      email: usuario.email,
      nombres: usuario.nombres,
      apellidos: usuario.apellidos
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

    await this.user_repository.update(usuario.id, {
      ultimo_acceso: new Date()
    });

    return {
      message: "Login exitoso",
      token,
      usuario: payload,
    };
  }

  async AddUser(rawData: any): Promise<User> {
    const validator = new CommonValidator();
    const data = await validator.validateDto(AddUserDto, rawData);

    const existingUser = await this.user_repository.findOne({
      where: { email: data.email },
    });

    if (existingUser) {
      throwHttpError("El correo electrónico ya está en uso", 409);
    }

    if (data.firebase_uid) {
      const existingFirebaseUser = await this.user_repository.findOne({
        where: { firebase_uid: data.firebase_uid },
      });

      if (existingFirebaseUser) {
        throwHttpError("Este usuario de Firebase ya está registrado", 409);
      }
    }

    if (!data.login_method || data.login_method === "email") {
      if (data.contrasena !== data.confirmar_nueva_contrasena) {
        throwHttpError("Las contraseñas no coinciden", 400);
      }
    }

    let hashed_password: string | null = null;
    if (!data.login_method || data.login_method === "email") {
      hashed_password = await bcrypt.hash(data.contrasena, 10);
    }

    const user = this.user_repository.create({
      nombres: data.nombres,
      apellidos: data.apellidos,
      email: data.email,
      contrasena: hashed_password,
      firebase_uid: data.firebase_uid || null,
      login_method: data.login_method || "email",
      foto_perfil: data.foto_perfil || null,
      email_verificado: data.login_method === "google",
      activo: false, // Por defecto inactivo hasta que haga login
      ultimo_acceso: new Date(),
    });

    const usuario_nuevo = await this.user_repository.save(user);

    return usuario_nuevo;
  }

  async deleteUser(id: number, cookies?: any) {
    const usuario = await this.user_repository.findOne({
      where: { id },
    });

    if (!usuario) {
      throwHttpError(`No se encontró el usuario con el id ${id}`, 404);
    }

    try {
      await axios.delete(`${EXAMS_MS_URL}/api/exams/by-user/${id}`, {
        timeout: 5000,
        headers: { Cookie: cookies || "" },
      });
    } catch (error: any) {
      throwHttpError(
        "No se pudieron eliminar los exámenes asociados al usuario: " +
          error.message,
        502
      );
    }

    await this.user_repository.remove(usuario);

    return { message: "Usuario eliminado correctamente" };
  }

  async editUser(rawData: any, id: number) {
    const validator = new CommonValidator();
    const data = await validator.validateDto(EditUserDto, rawData);

    const usuario = await this.user_repository.findOne({
      where: { id },
    });

    if (!usuario) {
      throwHttpError(`No se encontró un usuario con el id ${id}`, 404);
    }

    if (data.email && data.email !== usuario.email) {
      const emailExists = await this.user_repository.findOne({
        where: { email: data.email },
      });

      if (emailExists) {
        throwHttpError("El correo electrónico ya está en uso", 409);
      }
    }

    if (data.contrasena !== undefined) {
      if (data.contrasena !== data.confirmar_nueva_contrasena) {
        throwHttpError("Las contraseñas no coinciden", 400);
      }

      usuario.contrasena = await bcrypt.hash(data.contrasena, 10);
    }

    Object.assign(usuario, {
      nombres: data.nombres ?? usuario.nombres,
      apellidos: data.apellidos ?? usuario.apellidos,
      email: data.email ?? usuario.email,
      foto_perfil: data.foto_perfil ?? usuario.foto_perfil,
    });

    return await this.user_repository.save(usuario);
  }

  async getUserById(id: number) {
    try {
      const usuario_buscar = await this.user_repository.findOne({
        where: { id: id },
      });

      if (!usuario_buscar) {
        throw new Error(`No se encontró Ningún usuario con el id: ${id}`);
      }

      return usuario_buscar;
    } catch (error: any) {
      throw new Error("Ocurrió un error inesperado: " + error.message);
    }
  }

  async getAllusers() {
    try {
      const usuarios = await this.user_repository.find({
        where: { activo: true },
        select: ["id", "nombres", "apellidos", "email"],
      });

      return usuarios;
    } catch (error: any) {
      throw new Error("Error inesperado: " + error.message);
    }
  }

  async getUserByEmail(email: string): Promise<User> {
    const usuario = await this.user_repository.findOne({
      where: { email },
    });

    if (!usuario) {
      throwHttpError("Usuario no encontrado", 404);
    }

    return usuario;
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User> {
    const usuario = await this.user_repository.findOne({
      where: { firebase_uid: firebaseUid },
    });

    if (!usuario) {
      throwHttpError("Usuario no encontrado", 404);
    }

    return usuario;
  }

  async findOrCreateUser(data: AddUserDto): Promise<User> {
    try {
      const existingUser = await this.getUserByEmail(data.email);
      console.log("✅ Usuario existente encontrado");

      // Actualizar foto de perfil si viene una nueva y el usuario no tenía
      if (data.foto_perfil && !existingUser.foto_perfil) {
        existingUser.foto_perfil = data.foto_perfil;
        await this.user_repository.save(existingUser);
      }

      return existingUser;
    } catch (error: any) {
      if (error.statusCode === 404) {
        console.log("ℹ️ Usuario no existe, creando nuevo...");
        return await this.AddUser(data);
      }
      throw error;
    }
  }

  async updateLastAccess(userId: number): Promise<void> {
    await this.user_repository.update(userId, {
      ultimo_acceso: new Date(),
    });
  }

  async updateLastAccessById(userId: number): Promise<void> {
    try {
      await this.user_repository.update(userId, {
        ultimo_acceso: new Date(),
      });
      console.log(`✅ ultimo_acceso actualizado para usuario ${userId}`);
    } catch (error) {
      console.error(`❌ Error actualizando ultimo_acceso:`, error);
    }
  }

  // ============================================
  // ✅ NUEVO: GESTIÓN DE ESTADO ACTIVO
  // ============================================
  
  async setUserActive(userId: number, isActive: boolean): Promise<void> {
    try {
      const updateData: any = {
        activo: isActive
      };
      
      // Si está activo, actualizar último acceso
      if (isActive) {
        updateData.ultimo_acceso = new Date();
      }
      
      await this.user_repository.update(userId, updateData);
      console.log(`✅ Usuario ${userId} marcado como ${isActive ? 'activo' : 'inactivo'}`);
    } catch (error) {
      console.error(`❌ Error actualizando estado activo del usuario ${userId}:`, error);
      throw error;
    }
  }

  async getActiveUsers(): Promise<User[]> {
    try {
      const usuarios = await this.user_repository.find({
        where: { activo: true },
        select: ["id", "nombres", "apellidos", "email", "ultimo_acceso"],
      });

      return usuarios;
    } catch (error: any) {
      throw new Error("Error obteniendo usuarios activos: " + error.message);
    }
  }
}