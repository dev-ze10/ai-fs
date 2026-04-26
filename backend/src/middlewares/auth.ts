import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "change-me-in-production";

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or malformed token" });
    return;
  }

  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as { id: string };
    req.user = { id: payload.id };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
