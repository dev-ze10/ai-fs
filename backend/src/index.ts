import express, { type Request, type Response, type NextFunction } from "express";
import { authRouter } from "./routes/auth.routes.js";
import { campaignRouter } from "./routes/campaign.routes.js";

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use("/campaigns", campaignRouter);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  const isDev = process.env.NODE_ENV !== "production";
  res.status(500).json({
    error: "Internal server error",
    ...(isDev && { message: err.message }),
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Backend listening on :${port}`);
});
