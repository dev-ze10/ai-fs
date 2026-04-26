import express, { type Request, type Response, type NextFunction } from "express";
import { authRouter } from "./routes/auth.routes.js";
import { campaignRouter } from "./routes/campaign.routes.js";
import { recipientRouter } from "./routes/recipient.routes.js";

export const app = express();

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use("/campaigns", campaignRouter);
app.use("/recipients", recipientRouter);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  const isDev = process.env.NODE_ENV !== "production";
  res.status(500).json({
    error: "Internal server error",
    ...(isDev && { message: err.message }),
  });
});
