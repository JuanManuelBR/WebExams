import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth";

// ── Verifica que el usuario solo pueda modificar su propio perfil ────────────
export const authorizeOwnUser = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const tokenUserId = req.user?.id;
  const paramUserId = Number(req.params.id);

  if (isNaN(paramUserId)) {
    return res.status(400).json({ message: "ID de usuario inválido" });
  }

  if (tokenUserId !== paramUserId) {
    return res.status(403).json({
      message: "No tienes permiso para modificar este usuario",
    });
  }

  next();
};