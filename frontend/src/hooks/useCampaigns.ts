import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { extractError } from "../lib/axios";
import {
  fetchCampaigns,
  fetchCampaign,
  fetchCampaignStats,
  createCampaign,
  scheduleCampaign,
  sendCampaign,
  deleteCampaign,
} from "../api/campaigns";

export function useCampaignList() {
  return useQuery({
    queryKey: ["campaigns"],
    queryFn: fetchCampaigns,
  });
}

export function useCampaign(id: string) {
  return useQuery({
    queryKey: ["campaign", id],
    queryFn: () => fetchCampaign(id),
  });
}

export function useCampaignStats(id: string) {
  return useQuery({
    queryKey: ["campaign-stats", id],
    queryFn: () => fetchCampaignStats(id),
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCampaign,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign created");
    },
    onError: (err) => toast.error(extractError(err)),
  });
}

export function useScheduleCampaign(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scheduled_at: string) => scheduleCampaign(id, scheduled_at),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaign", id] });
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign scheduled");
    },
    onError: (err) => toast.error(extractError(err)),
  });
}

export function useSendCampaign(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => sendCampaign(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaign", id] });
      qc.invalidateQueries({ queryKey: ["campaign-stats", id] });
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign sent");
    },
    onError: (err) => toast.error(extractError(err)),
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteCampaign,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign deleted");
    },
    onError: (err) => toast.error(extractError(err)),
  });
}
