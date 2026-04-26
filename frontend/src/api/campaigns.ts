import { api } from "../lib/axios";

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  body: string;
  status: "draft" | "scheduled" | "sent";
  scheduled_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Recipient {
  id: string;
  email: string;
  name: string;
  status: "pending" | "sent" | "failed";
  sent_at: string | null;
  opened_at: string | null;
}

export interface CampaignWithRecipients extends Campaign {
  recipients: Recipient[];
}

export interface CampaignStats {
  total: number;
  sent: number;
  failed: number;
  opened: number;
  send_rate: number;
  open_rate: number;
}

export async function fetchCampaigns(): Promise<Campaign[]> {
  const res = await api.get("/campaigns");
  return res.data.data;
}

export async function fetchCampaign(id: string): Promise<CampaignWithRecipients> {
  const res = await api.get(`/campaigns/${id}`);
  return res.data.data;
}

export async function fetchCampaignStats(id: string): Promise<CampaignStats> {
  const res = await api.get(`/campaigns/${id}/stats`);
  return res.data.data;
}

export async function createCampaign(data: {
  name: string;
  subject: string;
  body: string;
  recipient_emails: string[];
}): Promise<Campaign> {
  const res = await api.post("/campaigns", data);
  return res.data.data;
}

export async function scheduleCampaign(id: string, scheduled_at: string) {
  const res = await api.post(`/campaigns/${id}/schedule`, { scheduled_at });
  return res.data.data;
}

export async function sendCampaign(id: string) {
  const res = await api.post(`/campaigns/${id}/send`);
  return res.data.data;
}

export async function deleteCampaign(id: string) {
  await api.delete(`/campaigns/${id}`);
}
