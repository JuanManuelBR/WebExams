import { UserService } from "@src/services/UserService";

import { Request, Response } from "express";

const user_service = new UserService();

export class UserController {
  static async AddUser(req: Request, res: Response) {
    try {
      const data = req.body;
      const usuario_nuevo = await user_service.AddUser(data);
      return res.status(201).json(usuario_nuevo);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  static async deleteUser(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const message = await user_service.deleteUser(Number(id));
      return res.status(200).json({ message });
    } catch (error: any) {
      if (error.message.includes("No se encontró")) {
        return res.status(404).json({
          message: "No se encontró un usuario con el id especificado",
        });
      }
      return res.status(400).json({ message: error.message });
    }
  }

  static async editUser(req: Request, res: Response) {
    try {
      const data = req.body;
      const id = req.params.id;
      console.log(id);
      await user_service.editUser(data, Number(id));

      return res
        .status(200)
        .json({ message: "Usuario actualizado correctamente:" });
    } catch (error: any) {
      return res.status(400).json({
        message: "No se pudo actualizar el usuario: " + error.message,
      });
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
          .json({ message: "No se econtró al usuario con el id especificado" });
      }

      return res
        .status(400)
        .json({ message: "Ocurrio un error inesperado: " + error.message });
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
}
