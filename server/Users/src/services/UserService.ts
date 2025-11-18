import { AppDataSource } from "@src/data-source/AppDataSource";
import { User } from "@src/models/User";
import { add_user_dto, edit_user_dto } from "@src/types/user";


import { JWT_SECRET } from "config/config";

import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

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

    const contrasena_valida = await bcrypt.compare(
      contrasena,
      usuario.contrasena
    );

    if (!contrasena_valida) {
      throw new Error("Contraseñla incorrecta");
    }

    // Validar que JWT_SECRET esté definido
    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET no está configurado");
    }

    const payload = {
      id: usuario.id,
      email: usuario.email,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

    return {
      message: "Login exitoso",
      token,
      usuario: payload,
    };
  }

  async AddUser(data: add_user_dto): Promise<User> {
    try {
      const requiredFields = [
        "primer_nombre",
        "primer_apellido",
        "email",
        "contrasena",
      ];

      for (const field of requiredFields) {
        if (
          data[field as keyof add_user_dto] === undefined ||
          data[field as keyof add_user_dto] === null
        ) {
          throw new Error(`Falta el campo obligatorio del usuario: ${field}`);
        }
      }

      const existingUser = await this.user_repository.findOne({
        where: { email: data.email },
      });

      if (existingUser) {
        throw new Error("El correo electrónico ya está en uso");
      }

      const hashed_password = await bcrypt.hash(data.contrasena, 10);
      data.contrasena = hashed_password;

      const user = this.user_repository.create(data);

      const usuario_nuevo = await this.user_repository.save(user);

      return usuario_nuevo;
    } catch (error: any) {
      console.error("No se pudo crear el nuevo usuario", error.message);

      throw error;
    }
  }

  async deleteUser(id: number) {
    try {
      const usuario_buscar = await this.user_repository.findOne({
        where: { id },
      });

      if (!usuario_buscar) {
        throw new Error(`No se encontró el usuario con el id ${id}`);
      }

      await this.user_repository.remove(usuario_buscar);

      return `Se eliminó al usuario correctamente`;
    } catch (error: any) {
      throw new Error(error.message || "No se pudo eliminar el usuario");
    }
  }

  async editUser(data: edit_user_dto, id: number) {
    try {
      const usuario = await this.user_repository.findOne({
        where: { id: id },
      });

      if (!usuario) {
        throw new Error(`No se encontró un usuario con el id ${id}`);
      }

      if (data.contrasena && data.confirmar_nueva_contrasena) {
        if (data.contrasena !== data.confirmar_nueva_contrasena) {
          throw new Error("Las contraseñas no coinciden");
        }

        const hashed = await bcrypt.hash(data.contrasena, 10);
        usuario.contrasena = hashed;
      }

      if (data.primer_nombre) usuario.primer_nombre = data.primer_nombre;
      if (data.segundo_nombre) usuario.segundo_nombre = data.segundo_nombre;
      if (data.primer_apellido) usuario.primer_apellido = data.primer_apellido;
      if (data.segundo_apellido)
        usuario.segundo_apellido = data.segundo_apellido;
      await this.user_repository.save(usuario);

      return {
        message: "Usuario actualizado correctamente",
        usuario,
      };
    } catch (error: any) {
      throw new Error(error.message || "Error al actualizar usuario");
    }
  }

  async getUserById(id: number) {
    try {
      const usuario_buscar = await this.user_repository.findOne({
        where: { id: id },
      });

      if (!usuario_buscar) {
        throw new Error(`No se encontró Ningún usuario con el id: ${id} `);
      }

      return usuario_buscar;
    } catch (error: any) {
      throw new Error("Ocurrió un error inesperado: " + error.message);
    }
  }

  async getAllusers() {
    try {
      const usuarios = await this.user_repository.find({
        select: [
          "id",
          "primer_nombre",
          "segundo_apellido",
          "primer_apellido",
          "segundo_apellido",
          "email",
        ],
      });

      return usuarios;
    } catch (error: any) {
      throw new Error("Error inesperado: " + error.message);
    }
  }
}
