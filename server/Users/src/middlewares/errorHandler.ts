import { Request, Response, NextFunction } from "express";
import { HttpError } from "../utils/errors";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      message: err.message,
    });
  }

  console.error(err);

  return res.status(500).json({
    message: "Error interno del servidor",
  });
}
