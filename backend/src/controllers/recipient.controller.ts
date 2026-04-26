import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "../db/index.js";

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255),
});

export async function list(_req: Request, res: Response, next: NextFunction) {
  try {
    const recipients = await db("recipients").orderBy("created_at", "desc");
    res.json({ success: true, data: recipients });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: "Validation failed", details: parsed.error.errors });
      return;
    }

    const existing = await db("recipients").where({ email: parsed.data.email }).first();
    if (existing) {
      res.status(409).json({ success: false, error: "Recipient email already exists" });
      return;
    }

    const [recipient] = await db("recipients").insert(parsed.data).returning("*");
    res.status(201).json({ success: true, data: recipient });
  } catch (err) {
    next(err);
  }
}
