import { AppDataSource } from "@src/data-source/AppDataSource";
import { plainToInstance } from "class-transformer";
import { validate, ValidationError } from "class-validator";
import { HttpError } from "@src/utils/errors";

export type FormattedError = {
  property: string;
  constraints: string[];
};

/**
 * Valida un objeto plano contra una clase DTO y formatea los errores.
 * @param dtoClass La clase DTO (e.g., CreateCuotaDTO).
 * @param plainObject El objeto a validar (e.g., req.body).
 * @returns Un array de FormattedError o un array vacío si no hay errores.
 */
export async function validateDTO<T extends object>(
  dtoClass: new (...args: any[]) => T,
  plainObject: any,
): Promise<FormattedError[]> {
  // 1. Transformar el objeto plano a una instancia de la clase DTO
  // Esto permite que class-validator y class-transformer funcionen correctamente (ej. @Type)
  const dtoInstance = plainToInstance(dtoClass, plainObject);

  // 2. Ejecutar la validación
  const errors = await validate(dtoInstance);

  // 3. Si no hay errores, retornar un array vacío
  if (errors.length === 0) {
    return [];
  }

  // 4. Formatear y aplanar los errores
  const formattedErrors: FormattedError[] = [];

  // Función recursiva para extraer los mensajes de error (constraints)
  const extractErrors = (validationErrors: ValidationError[]) => {
    for (const error of validationErrors) {
      if (error.constraints) {
        // Si hay constraints, agregarlos a la lista de errores
        formattedErrors.push({
          property: error.property,
          constraints: Object.values(error.constraints),
        });
      }
      // Si hay errores anidados (ej. DTOs dentro de arrays)
      if (error.children && error.children.length > 0) {
        extractErrors(error.children);
      }
    }
  };

  extractErrors(errors);

  return formattedErrors;
}

export function throwHttpError(message: string, status: number): never {
  throw new HttpError(message, status);
}

export function validateRangoFechas(fechai: string, fechaf: string) {
  const fechaiDate = new Date(String(fechai));
  const fechafDate = new Date(String(fechaf));

  if (fechaiDate.getTime() > fechafDate.getTime()) {
    throwHttpError(
      "La fecha de finalización debe ser posterior a la fecha de inicio",
      400,
    );
  }
}

export function throwValidationErrors(errors: FormattedError[]): never {
  const message = errors
    .map((e) => `${e.property}: ${e.constraints.join(", ")}`)
    .join("; ");
  throw new HttpError(`Errores de validación: ${message}`, 400);
}
