import request from "supertest";
import { app } from "../app.js";
import { db } from "../db/index.js";

let token: string;
let userId: string;

let otherToken: string;
let otherUserId: string;

beforeAll(async () => {
  const res = await request(app)
    .post("/auth/register")
    .send({ email: "test-runner@example.com", name: "Test Runner", password: "securepass123" });
  token = res.body.token;
  userId = res.body.user.id;

  const res2 = await request(app)
    .post("/auth/register")
    .send({ email: "other-user@example.com", name: "Other User", password: "securepass123" });
  otherToken = res2.body.token;
  otherUserId = res2.body.user.id;
});

afterAll(async () => {
  await db("campaign_recipients").del();
  await db("campaigns").del();
  await db("recipients").del();
  await db("users").whereIn("id", [userId, otherUserId]).del();
  await db.destroy();
});

async function createDraftCampaign(
  ownerToken = token,
  name = "Test Campaign",
  recipient_emails: string[] = [],
) {
  const res = await request(app)
    .post("/campaigns")
    .set("Authorization", `Bearer ${ownerToken}`)
    .send({ name, subject: "Subject", body: "Body text", recipient_emails });
  return res.body.data;
}

async function createRecipient(email: string, name: string) {
  const res = await request(app)
    .post("/recipients")
    .set("Authorization", `Bearer ${token}`)
    .send({ email, name });
  return res.body.data;
}

// ─── Authentication ──────────────────────────────────────────────────

describe("Authentication", () => {
  it("rejects requests with no token (401)", async () => {
    const res = await request(app).get("/campaigns");

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Missing or malformed token");
  });

  it("rejects requests with an invalid token (401)", async () => {
    const res = await request(app)
      .get("/campaigns")
      .set("Authorization", "Bearer totally.invalid.token");

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid or expired token");
  });

  it("rejects requests with a malformed Authorization header (401)", async () => {
    const res = await request(app)
      .get("/campaigns")
      .set("Authorization", "Basic some-credentials");

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Missing or malformed token");
  });
});

// ─── Authorization / ownership ───────────────────────────────────────

describe("Authorization (cross-user isolation)", () => {
  it("returns 404 when accessing another user's campaign", async () => {
    const campaign = await createDraftCampaign(token);

    const res = await request(app)
      .get(`/campaigns/${campaign.id}`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, error: "Campaign not found" });
  });

  it("prevents another user from deleting a campaign", async () => {
    const campaign = await createDraftCampaign(token);

    const res = await request(app)
      .delete(`/campaigns/${campaign.id}`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(res.status).toBe(404);

    const verify = await request(app)
      .get(`/campaigns/${campaign.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(verify.status).toBe(200);
    expect(verify.body.data.id).toBe(campaign.id);
  });

  it("does not leak campaigns in another user's list", async () => {
    await createDraftCampaign(token, "Owner Only");

    const res = await request(app)
      .get("/campaigns")
      .set("Authorization", `Bearer ${otherToken}`);

    expect(res.status).toBe(200);
    const ids = res.body.data.map((c: { created_by: string }) => c.created_by);
    expect(ids.every((id: string) => id === otherUserId)).toBe(true);
  });
});

// ─── Validation errors ──────────────────────────────────────────────

describe("Validation", () => {
  it("rejects campaign creation with missing required fields (400)", async () => {
    const res = await request(app)
      .post("/campaigns")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Only Name" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("Validation failed");
    const paths = res.body.details.map((d: { path: string[] }) => d.path[0]);
    expect(paths).toContain("subject");
    expect(paths).toContain("body");
  });

  it("rejects PATCH with an invalid UUID param (400)", async () => {
    const res = await request(app)
      .patch("/campaigns/not-a-uuid")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "x" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.details[0].message).toBe("Invalid campaign ID");
  });
});

// ─── 404 / edge cases ───────────────────────────────────────────────

describe("Not found", () => {
  it("returns 404 for a valid UUID that does not exist", async () => {
    const fakeId = "00000000-0000-4000-a000-000000000000";

    const res = await request(app)
      .get(`/campaigns/${fakeId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, error: "Campaign not found" });
  });
});

// ─── Status-based restrictions ──────────────────────────────────────

describe("Campaign edit restrictions by status", () => {
  it("rejects PATCH on a scheduled campaign (400)", async () => {
    const campaign = await createDraftCampaign();

    await request(app)
      .post(`/campaigns/${campaign.id}/schedule`)
      .set("Authorization", `Bearer ${token}`)
      .send({ scheduled_at: new Date(Date.now() + 86_400_000).toISOString() });

    const res = await request(app)
      .patch(`/campaigns/${campaign.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Should Fail" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("Only draft campaigns can be updated");
  });

  it("rejects PATCH on a sent campaign (400)", async () => {
    const campaign = await createDraftCampaign();

    await request(app)
      .post(`/campaigns/${campaign.id}/send`)
      .set("Authorization", `Bearer ${token}`);

    const res = await request(app)
      .patch(`/campaigns/${campaign.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Should Fail" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("Only draft campaigns can be updated");
  });

  it("rejects DELETE on a sent campaign (400)", async () => {
    const campaign = await createDraftCampaign();

    await request(app)
      .post(`/campaigns/${campaign.id}/send`)
      .set("Authorization", `Bearer ${token}`);

    const res = await request(app)
      .delete(`/campaigns/${campaign.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Only draft campaigns can be deleted");
  });
});

// ─── Schedule validation ────────────────────────────────────────────

describe("Schedule validation", () => {
  it("rejects a past timestamp (400)", async () => {
    const campaign = await createDraftCampaign();

    const res = await request(app)
      .post(`/campaigns/${campaign.id}/schedule`)
      .set("Authorization", `Bearer ${token}`)
      .send({ scheduled_at: "2020-01-01T00:00:00Z" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: "scheduled_at must be a future timestamp" }),
      ]),
    );
  });

  it("rejects a non-ISO string (400)", async () => {
    const campaign = await createDraftCampaign();

    const res = await request(app)
      .post(`/campaigns/${campaign.id}/schedule`)
      .set("Authorization", `Bearer ${token}`)
      .send({ scheduled_at: "next tuesday" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ─── Send workflow ──────────────────────────────────────────────────

describe("Send workflow", () => {
  it("prevents re-sending a campaign that is already sent (400)", async () => {
    const campaign = await createDraftCampaign();

    await request(app)
      .post(`/campaigns/${campaign.id}/send`)
      .set("Authorization", `Bearer ${token}`);

    const res = await request(app)
      .post(`/campaigns/${campaign.id}/send`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, error: "Campaign has already been sent" });
  });

  it("randomly marks each recipient as sent or failed", async () => {
    const emails = Array.from({ length: 20 }, (_, i) => `send-rand-${i}@test.com`);
    const campaign = await createDraftCampaign(token, "Random Send Test", emails);

    await request(app)
      .post(`/campaigns/${campaign.id}/send`)
      .set("Authorization", `Bearer ${token}`);

    const show = await request(app)
      .get(`/campaigns/${campaign.id}`)
      .set("Authorization", `Bearer ${token}`);

    const statuses = show.body.data.recipients.map((r: { status: string }) => r.status);
    expect(statuses).toHaveLength(20);
    expect(statuses.every((s: string) => s === "sent" || s === "failed")).toBe(true);

    const sentRecipients = show.body.data.recipients.filter((r: { status: string; sent_at: string | null }) => r.status === "sent");
    for (const r of sentRecipients) {
      expect(r.sent_at).not.toBeNull();
    }

    const failedRecipients = show.body.data.recipients.filter((r: { status: string; sent_at: string | null }) => r.status === "failed");
    for (const r of failedRecipients) {
      expect(r.sent_at).toBeNull();
    }
  });
});

// ─── Create with recipient_emails ───────────────────────────────────

describe("Create campaign with recipient_emails", () => {
  it("creates recipients and links them as pending", async () => {
    const emails = ["create-r1@test.com", "create-r2@test.com"];
    const campaign = await createDraftCampaign(token, "With Recipients", emails);

    const show = await request(app)
      .get(`/campaigns/${campaign.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(show.body.data.recipients).toHaveLength(2);
    const recipientEmails = show.body.data.recipients.map((r: { email: string }) => r.email).sort();
    expect(recipientEmails).toEqual(emails.sort());
    expect(show.body.data.recipients.every((r: { status: string }) => r.status === "pending")).toBe(true);
  });

  it("reuses existing recipients instead of duplicating", async () => {
    await createRecipient("existing@test.com", "Existing");

    const campaign = await createDraftCampaign(token, "Reuse Test", ["existing@test.com", "brand-new@test.com"]);

    const show = await request(app)
      .get(`/campaigns/${campaign.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(show.body.data.recipients).toHaveLength(2);

    const allRecipients = await request(app)
      .get("/recipients")
      .set("Authorization", `Bearer ${token}`);
    const matches = allRecipients.body.data.filter((r: { email: string }) => r.email === "existing@test.com");
    expect(matches).toHaveLength(1);
  });

  it("rejects invalid emails in recipient_emails (400)", async () => {
    const res = await request(app)
      .post("/campaigns")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Bad", subject: "S", body: "B", recipient_emails: ["not-an-email"] });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ─── Recipients ─────────────────────────────────────────────────────

describe("Recipients", () => {
  it("creates a recipient (201)", async () => {
    const res = await request(app)
      .post("/recipients")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "recipient-create@test.com", name: "New Recipient" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      email: "recipient-create@test.com",
      name: "New Recipient",
    });
    expect(res.body.data.id).toBeDefined();
  });

  it("rejects duplicate email (409)", async () => {
    await createRecipient("dup@test.com", "First");

    const res = await request(app)
      .post("/recipients")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "dup@test.com", name: "Second" });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ success: false, error: "Recipient email already exists" });
  });

  it("rejects invalid email format (400)", async () => {
    const res = await request(app)
      .post("/recipients")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "not-an-email", name: "Bad" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("Validation failed");
  });

  it("lists all recipients (200)", async () => {
    const res = await request(app)
      .get("/recipients")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("requires authentication (401)", async () => {
    const get = await request(app).get("/recipients");
    const post = await request(app)
      .post("/recipients")
      .send({ email: "x@test.com", name: "X" });

    expect(get.status).toBe(401);
    expect(post.status).toBe(401);
  });
});

// ─── Stats calculation ──────────────────────────────────────────────

describe("Stats calculation", () => {
  it("returns all zeros for a campaign with no recipients", async () => {
    const campaign = await createDraftCampaign();

    const res = await request(app)
      .get(`/campaigns/${campaign.id}/stats`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      total: 0,
      sent: 0,
      failed: 0,
      opened: 0,
      send_rate: 0,
      open_rate: 0,
    });
  });

  it("computes correct rates matching actual recipient states after send", async () => {
    const emails = Array.from({ length: 20 }, (_, i) => `stats-calc-${i}@test.com`);
    const campaign = await createDraftCampaign(token, "Stats Test", emails);

    await request(app)
      .post(`/campaigns/${campaign.id}/send`)
      .set("Authorization", `Bearer ${token}`);

    const show = await request(app)
      .get(`/campaigns/${campaign.id}`)
      .set("Authorization", `Bearer ${token}`);

    const recipients = show.body.data.recipients;
    const total = recipients.length;
    const sent = recipients.filter((r: { status: string }) => r.status === "sent").length;
    const failed = recipients.filter((r: { status: string }) => r.status === "failed").length;

    expect(total).toBe(20);
    expect(sent + failed).toBe(20);

    const statsRes = await request(app)
      .get(`/campaigns/${campaign.id}/stats`)
      .set("Authorization", `Bearer ${token}`);

    expect(statsRes.status).toBe(200);
    expect(statsRes.body.success).toBe(true);
    expect(statsRes.body.data).toEqual({
      total,
      sent,
      failed,
      opened: 0,
      send_rate: +(sent / total).toFixed(4),
      open_rate: 0,
    });
  });
});
