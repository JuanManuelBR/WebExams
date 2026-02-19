import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export interface AuthenticatedRequest extends Request {
  user?: any;
  authHeader?: string;
  cookieToken?: string;
}

export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  // 1) Intenta por header Authorization
  const authHeader =
    (req.headers["authorization"] as string | undefined) ||
    req.get("authorization") ||
    req.get("Authorization") ||
    undefined;

  let token: string | undefined;

  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    token = authHeader.slice(7).trim();
  }

  // 2) Si no hay Bearer, intenta por cookie "token"
  if (!token) {
    const cookieTok = (req.cookies && req.cookies.token) as string | undefined;
    if (cookieTok && String(cookieTok).trim() !== "") {
      token = String(cookieTok).trim();
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Token requerido" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    req.authHeader = authHeader; // por si quieres reenviar el Authorization tal cual
    req.cookieToken = token; // por si quieres reenviar como cookie al otro MS
    return next();
  } catch {
    return res.status(403).json({ message: "Token inválido o expirado" });
  }
}
