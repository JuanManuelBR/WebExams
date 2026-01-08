// ============================================
// 📁 BACKEND/src/controllers/UserController.ts
// CÓDIGO COMPLETO - COOKIES CORREGIDAS
// ============================================

import { UserService } from "@src/services/UserService";
import { throwHttpError } from "@src/utils/errors";
import { NextFunction, Request, Response } from "express";

const user_service = new UserService();

export class UserController {
  static async AddUser(req: Request, res: Response, next: NextFunction) {
    try {
      const usuario_nuevo = await user_service.AddUser(req.body);

      return res.status(201).json(usuario_nuevo);
    } catch (error) {
      next(error);
    }
  }

  static async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const cookies = req.headers.cookie;
      const id = Number(req.params.id);

      if (isNaN(id)) {
        throwHttpError("ID inválido", 400);
      }

      const result = await user_service.deleteUser(id, cookies);

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async editUser(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);

      if (isNaN(id)) {
        throwHttpError("ID inválido", 400);
      }
      if (!req.body || Object.keys(req.body).length === 0) {
        throwHttpError("Debe enviar al menos un campo para actualizar", 400);
      }

      const usuario = await user_service.editUser(req.body, id);

      return res.status(200).json(usuario);
    } catch (error) {
      next(error);
    }
  }

  static async getUserById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);

      const usuario = await user_service.getUserById(id);

      return res.status(200).json(usuario);
    } catch (error: any) {
      if (error.message.includes("No se encontró")) {
        return res
          .status(404)
          .json({ message: "No se encontró al usuario con el id especificado" });
      }

      return res
        .status(400)
        .json({ message: "Ocurrió un error inesperado: " + error.message });
    }
  }

  static async getUsers(req: Request, res: Response) {
    try {
      const usuarios = await user_service.getAllusers();
      return res.status(200).json(usuarios);
    } catch (error: any) {
      return res
        .status(400)
        .json({ message: "Ocurrió un error inesperado: " + error.message });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const data = req.body;
      const { message, token, usuario } = await user_service.login(
        data.email,
        data.contrasena
      );

      // ✅ COOKIE CORREGIDA - SIN DOMAIN
      res.cookie("token", token, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 3600000,
      });

      return res.status(200).json({
        message,
        usuario,
      });
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  static async logout(req: Request, res: Response) {
    try {
      // ✅ COOKIE CORREGIDA - SIN DOMAIN
      res.clearCookie("token", {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
      });

      return res.status(200).json({ message: "Logout exitoso" });
    } catch (error: any) {
      return res.status(500).json({ message: "Error al cerrar sesión" });
    }
  }

  static async getUserByEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.params;
      const usuario = await user_service.getUserByEmail(email);

      const { contrasena, ...usuarioSinPassword } = usuario;

      return res.status(200).json(usuarioSinPassword);
    } catch (error) {
      next(error);
    }
  }

  static async getUserByFirebaseUid(req: Request, res: Response, next: NextFunction) {
    try {
      const { firebaseUid } = req.params;
      const usuario = await user_service.getUserByFirebaseUid(firebaseUid);

      const { contrasena, ...usuarioSinPassword } = usuario;

      return res.status(200).json(usuarioSinPassword);
    } catch (error) {
      next(error);
    }
  }

  static async findOrCreateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const usuario = await user_service.findOrCreateUser(req.body);

      const { contrasena, ...usuarioSinPassword } = usuario;

      return res.status(200).json(usuarioSinPassword);
    } catch (error) {
      next(error);
    }
  }

  static async updateLastAccess(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);

      if (isNaN(id)) {
        throwHttpError("ID inválido", 400);
      }

      await user_service.updateLastAccessById(id);

      return res.status(200).json({ 
        message: "Último acceso actualizado correctamente" 
      });
    } catch (error) {
      next(error);
    }
  }
}