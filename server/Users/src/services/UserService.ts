import { AppDataSource } from "@src/data-source/AppDataSource";
import { User } from "@src/models/User";
import { add_user_dto } from "@src/types/user";
import bcrypt from "bcrypt";

export class UserService {
  private user_repository = AppDataSource.getRepository(User);

  async AddUser(data: add_user_dto): Promise<User> {
    try {
      const requiredFields = [
        "primer_nombre",
        "primer_apellido",
        "tipo",
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
    } catch (error) {
      throw new Error("No se pudo eliminar el usuario");
    }
  }
}
