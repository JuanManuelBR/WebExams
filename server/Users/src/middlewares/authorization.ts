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

// ── Token compartido entre microservicios (x-service-token header) ───────────
export const authenticateServiceToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const received = req.headers["x-service-token"];
  const expected = process.env.SERVICE_SECRET;

  if (!expected) {
    console.error("SERVICE_SECRET no está configurado en las variables de entorno");
    return res.status(500).json({ message: "Error de configuración del servidor" });
  }

  if (!received || received !== expected) {
    return res.status(401).json({ message: "Token de servicio inválido" });
  }

  next();
};

// ── Permite acceso si tiene token de usuario O token de servicio ─────────────
// Útil para endpoints que tanto el frontend como otros MS necesitan llamar
export const authenticateAny = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const serviceToken = req.headers["x-service-token"];
  const expected = process.env.SERVICE_SECRET;

  // Si tiene service token válido, pasa directo
  if (expected && serviceToken === expected) {
    return next();
  }

  // Si no, debe tener token de usuario (reutiliza la lógica de auth.ts)
  const authHeader = req.headers["authorization"] as string | undefined;
  const cookieToken = req.cookies?.token as string | undefined;

  let token: string | undefined;
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    token = authHeader.slice(7).trim();
  } else if (cookieToken?.trim()) {
    token = cookieToken.trim();
  }

  if (!token) {
    return res.status(401).json({ message: "Token requerido" });
  }

  try {
    const jwt = require("jsonwebtoken");
    req.user = jwt.verify(token, process.env.JWT_SECRET || "");
    return next();
  } catch {
    return res.status(403).json({ message: "Token inválido o expirado" });
  }
};