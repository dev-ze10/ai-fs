import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import {
  list,
  create,
  show,
  update,
  remove,
  schedule,
  send,
  stats,
} from "../controllers/campaign.controller.js";

export const campaignRouter = Router();

campaignRouter.use(authenticate);

campaignRouter.get("/", list);
campaignRouter.post("/", create);
campaignRouter.get("/:id", show);
campaignRouter.patch("/:id", update);
campaignRouter.delete("/:id", remove);
campaignRouter.post("/:id/schedule", schedule);
campaignRouter.post("/:id/send", send);
campaignRouter.get("/:id/stats", stats);
