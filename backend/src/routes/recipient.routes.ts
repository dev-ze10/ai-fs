import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { list, create } from "../controllers/recipient.controller.js";

export const recipientRouter = Router();

recipientRouter.use(authenticate);

recipientRouter.get("/", list);
recipientRouter.post("/", create);
