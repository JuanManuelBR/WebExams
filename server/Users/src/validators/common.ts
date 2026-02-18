import { plainToInstance } from "class-transformer";
import { validate, ValidationError } from "class-validator";
import { throwHttpError } from "../utils/errors";

export class CommonValidator {
  // Función recursiva para obtener todos los errores, incluidos los anidados
  private flattenValidationErrors(errors: ValidationError[]): string[] {
    return errors.flatMap((err) => {
      const constraints = err.constraints ? Object.values(err.constraints) : [];

      const children =
        err.children && err.children.length > 0
          ? this.flattenValidationErrors(err.children)
          : [];

      return [...constraints, ...children];
    });
  }

  // Valida un DTO genérico
  async validateDto<T extends object>(
    dtoClass: new (...args: any[]) => T,
    rawData: any
  ): Promise<T> {
    const dto = plainToInstance(dtoClass, rawData, {
      enableImplicitConversion: true,
    });

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
      skipMissingProperties: false,
      validationError: { target: false, value: false },
    });

    if (errors.length > 0) {
      const messages = this.flattenValidationErrors(errors).join(", ");

      throwHttpError(`Errores de validación: ${messages}`, 400);
    }

    return dto;
  }
}
