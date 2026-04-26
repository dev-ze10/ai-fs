import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z, ZodError } from "zod";
import { db } from "../db/index.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "change-me-in-production";
const SALT_ROUNDS = 10;

export const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function signToken(id: string): string {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: "7d" });
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.errors });
      return;
    }

    const { email, name, password } = parsed.data;

    const existing = await db("users").where({ email }).first();
    if (existing) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const [user] = await db("users")
      .insert({ email, name, password_hash })
      .returning(["id", "email", "name", "created_at"]);

    const token = signToken(user.id);

    res.status(201).json({ token, user });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.errors });
      return;
    }

    const { email, password } = parsed.data;

    const user = await db("users").where({ email }).first();
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = signToken(user.id);

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, created_at: user.created_at },
    });
  } catch (err) {
    next(err);
  }
}
