import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "../db/index.js";

const createSchema = z.object({
  name: z.string().min(1).max(255),
  subject: z.string().min(1).max(255),
  body: z.string().min(1),
  recipient_emails: z.array(z.string().email()).optional().default([]),
});

const updateSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    subject: z.string().min(1).max(255).optional(),
    body: z.string().min(1).optional(),
  })
  .refine((d) => d.name || d.subject || d.body, {
    message: "At least one field (name, subject, body) is required",
  });

const scheduleSchema = z.object({
  scheduled_at: z
    .string()
    .datetime()
    .refine((v) => new Date(v) > new Date(), {
      message: "scheduled_at must be a future timestamp",
    }),
});

const paramsSchema = z.object({
  id: z.string().uuid("Invalid campaign ID"),
});


async function findOwnedCampaign(id: string, userId: string) {
  return db("campaigns").where({ id, created_by: userId }).first();
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const campaigns = await db("campaigns")
      .where({ created_by: req.user!.id })
      .orderBy("created_at", "desc");

    res.json({ success: true, data: campaigns });
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

    const { recipient_emails, ...campaignData } = parsed.data;

    const [campaign] = await db("campaigns")
      .insert({ ...campaignData, status: "draft", created_by: req.user!.id })
      .returning("*");

    if (recipient_emails.length > 0) {
      const recipientIds: string[] = [];

      for (const email of recipient_emails) {
        let recipient = await db("recipients").where({ email }).first();
        if (!recipient) {
          [recipient] = await db("recipients")
            .insert({ email, name: email.split("@")[0] })
            .returning("*");
        }
        recipientIds.push(recipient.id);
      }

      await db("campaign_recipients").insert(
        recipientIds.map((recipient_id) => ({
          campaign_id: campaign.id,
          recipient_id,
          status: "pending",
        })),
      );
    }

    res.status(201).json({ success: true, data: campaign });
  } catch (err) {
    next(err);
  }
}

export async function show(req: Request, res: Response, next: NextFunction) {
  try {
    const params = paramsSchema.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ success: false, error: "Validation failed", details: params.error.errors });
      return;
    }

    const campaign = await findOwnedCampaign(params.data.id, req.user!.id);
    if (!campaign) {
      res.status(404).json({ success: false, error: "Campaign not found" });
      return;
    }

    const recipients = await db("campaign_recipients")
      .join("recipients", "campaign_recipients.recipient_id", "recipients.id")
      .where("campaign_recipients.campaign_id", campaign.id)
      .select(
        "recipients.id",
        "recipients.email",
        "recipients.name",
        "campaign_recipients.status",
        "campaign_recipients.sent_at",
        "campaign_recipients.opened_at",
      );

    res.json({ success: true, data: { ...campaign, recipients } });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const params = paramsSchema.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ success: false, error: "Validation failed", details: params.error.errors });
      return;
    }

    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: "Validation failed", details: parsed.error.errors });
      return;
    }

    const campaign = await findOwnedCampaign(params.data.id, req.user!.id);
    if (!campaign) {
      res.status(404).json({ success: false, error: "Campaign not found" });
      return;
    }
    if (campaign.status !== "draft") {
      res.status(400).json({ success: false, error: "Only draft campaigns can be updated" });
      return;
    }

    const [updated] = await db("campaigns")
      .where({ id: campaign.id })
      .update(parsed.data)
      .returning("*");

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const params = paramsSchema.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ success: false, error: "Validation failed", details: params.error.errors });
      return;
    }

    const campaign = await findOwnedCampaign(params.data.id, req.user!.id);
    if (!campaign) {
      res.status(404).json({ success: false, error: "Campaign not found" });
      return;
    }
    if (campaign.status !== "draft") {
      res.status(400).json({ success: false, error: "Only draft campaigns can be deleted" });
      return;
    }

    await db("campaigns").where({ id: campaign.id }).del();

    res.json({ success: true, data: { id: campaign.id } });
  } catch (err) {
    next(err);
  }
}

export async function schedule(req: Request, res: Response, next: NextFunction) {
  try {
    const params = paramsSchema.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ success: false, error: "Validation failed", details: params.error.errors });
      return;
    }

    const parsed = scheduleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: "Validation failed", details: parsed.error.errors });
      return;
    }

    const campaign = await findOwnedCampaign(params.data.id, req.user!.id);
    if (!campaign) {
      res.status(404).json({ success: false, error: "Campaign not found" });
      return;
    }
    if (campaign.status !== "draft") {
      res.status(400).json({ success: false, error: "Only draft campaigns can be scheduled" });
      return;
    }

    const [updated] = await db("campaigns")
      .where({ id: campaign.id })
      .update({ status: "scheduled", scheduled_at: parsed.data.scheduled_at })
      .returning("*");

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function send(req: Request, res: Response, next: NextFunction) {
  try {
    const params = paramsSchema.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ success: false, error: "Validation failed", details: params.error.errors });
      return;
    }

    const campaign = await findOwnedCampaign(params.data.id, req.user!.id);
    if (!campaign) {
      res.status(404).json({ success: false, error: "Campaign not found" });
      return;
    }
    if (campaign.status === "sent") {
      res.status(400).json({ success: false, error: "Campaign has already been sent" });
      return;
    }

    const now = new Date().toISOString();

    await db.transaction(async (trx) => {
      await trx("campaigns")
        .where({ id: campaign.id })
        .update({ status: "sent" });

      const recipients = await trx("campaign_recipients")
        .where({ campaign_id: campaign.id })
        .select("id");

      for (const row of recipients) {
        const status = Math.random() < 0.8 ? "sent" : "failed";
        await trx("campaign_recipients")
          .where({ id: row.id })
          .update({
            status,
            ...(status === "sent" && { sent_at: now }),
          });
      }
    });

    const updated = await findOwnedCampaign(campaign.id, req.user!.id);

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function stats(req: Request, res: Response, next: NextFunction) {
  try {
    const params = paramsSchema.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ success: false, error: "Validation failed", details: params.error.errors });
      return;
    }

    const campaign = await findOwnedCampaign(params.data.id, req.user!.id);
    if (!campaign) {
      res.status(404).json({ success: false, error: "Campaign not found" });
      return;
    }

    const [row] = await db("campaign_recipients")
      .where({ campaign_id: campaign.id })
      .select(
        db.raw("COUNT(*)::int AS total"),
        db.raw("COUNT(*) FILTER (WHERE status = 'sent')::int AS sent"),
        db.raw("COUNT(*) FILTER (WHERE status = 'failed')::int AS failed"),
        db.raw("COUNT(*) FILTER (WHERE opened_at IS NOT NULL)::int AS opened"),
      );

    const total = row.total ?? 0;

    res.json({
      success: true,
      data: {
        total,
        sent: row.sent ?? 0,
        failed: row.failed ?? 0,
        opened: row.opened ?? 0,
        send_rate: total > 0 ? +(row.sent / total).toFixed(4) : 0,
        open_rate: total > 0 ? +(row.opened / total).toFixed(4) : 0,
      },
    });
  } catch (err) {
    next(err);
  }
}


