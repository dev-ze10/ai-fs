import { useParams, useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import {
  useCampaign,
  useCampaignStats,
  useScheduleCampaign,
  useSendCampaign,
  useDeleteCampaign,
} from "../hooks/useCampaigns";
import { StatusBadge } from "../components/ui/StatusBadge";
import { ProgressBar } from "../components/ui/ProgressBar";
import { Skeleton } from "../components/ui/Skeleton";
import { Modal } from "../components/ui/Modal";
import { Spinner } from "../components/ui/Spinner";

export function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: campaign, isLoading, isError } = useCampaign(id!);
  const { data: stats } = useCampaignStats(id!);

  const scheduleMut = useScheduleCampaign(id!);
  const sendMut = useSendCampaign(id!);
  const deleteMut = useDeleteCampaign();

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [confirmSendOpen, setConfirmSendOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleDateError, setScheduleDateError] = useState("");

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (isError || !campaign) {
    return (
      <div className="rounded-lg bg-white p-12 text-center shadow">
        <p className="text-lg font-medium text-gray-400">
          Campaign not found
        </p>
        <Link
          to="/campaigns"
          className="mt-4 inline-block text-sm text-blue-600 hover:text-blue-700"
        >
          Back to campaigns
        </Link>
      </div>
    );
  }

  const isDraft = campaign.status === "draft";
  const isSent = campaign.status === "sent";

  const handleSchedule = () => {
    setScheduleDateError("");
    if (!scheduleDate) {
      setScheduleDateError("Select a date and time");
      return;
    }
    if (new Date(scheduleDate) <= new Date()) {
      setScheduleDateError("Must be a future date");
      return;
    }
    scheduleMut.mutate(new Date(scheduleDate).toISOString(), {
      onSuccess: () => setScheduleOpen(false),
    });
  };

  const handleSend = () => {
    sendMut.mutate(undefined, {
      onSuccess: () => setConfirmSendOpen(false),
    });
  };

  const handleDelete = () => {
    deleteMut.mutate(id!, {
      onSuccess: () => navigate("/campaigns"),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            to="/campaigns"
            className="mb-2 inline-block text-sm text-gray-500 hover:text-gray-700"
          >
            &larr; Back
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
          <div className="mt-1">
            <StatusBadge status={campaign.status} />
          </div>
        </div>

        <div className="flex gap-2">
          {isDraft && (
            <>
              <button
                onClick={() => setScheduleOpen(true)}
                className="rounded border border-blue-300 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50"
              >
                Schedule
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteMut.isPending}
                className="flex items-center gap-1 rounded border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {deleteMut.isPending && <Spinner />}
                Delete
              </button>
            </>
          )}
          {!isSent && (
            <button
              onClick={() => setConfirmSendOpen(true)}
              className="rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
            >
              Send Now
            </button>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="rounded-lg bg-white p-6 shadow">
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="font-medium text-gray-500">Subject</dt>
            <dd className="mt-1 text-gray-900">{campaign.subject}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Created</dt>
            <dd className="mt-1 text-gray-900">
              {new Date(campaign.created_at).toLocaleString()}
            </dd>
          </div>
          {campaign.scheduled_at && (
            <div>
              <dt className="font-medium text-gray-500">Scheduled</dt>
              <dd className="mt-1 text-gray-900">
                {new Date(campaign.scheduled_at).toLocaleString()}
              </dd>
            </div>
          )}
          <div className="col-span-2">
            <dt className="font-medium text-gray-500">Body</dt>
            <dd className="mt-1 whitespace-pre-wrap text-gray-900">
              {campaign.body}
            </dd>
          </div>
        </dl>
      </div>

      {/* Stats */}
      {stats && stats.total > 0 && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Stats</h2>
          <div className="mb-6 grid grid-cols-4 gap-4 text-center text-sm">
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-gray-500">Total</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
              <p className="text-gray-500">Sent</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              <p className="text-gray-500">Failed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{stats.opened}</p>
              <p className="text-gray-500">Opened</p>
            </div>
          </div>
          <div className="space-y-3">
            <ProgressBar
              label="Send Rate"
              value={stats.send_rate}
              color="bg-green-500"
            />
            <ProgressBar
              label="Open Rate"
              value={stats.open_rate}
              color="bg-blue-500"
            />
          </div>
        </div>
      )}

      {/* Recipients */}
      <div className="rounded-lg bg-white shadow">
        <h2 className="border-b px-6 py-4 text-lg font-semibold text-gray-900">
          Recipients ({campaign.recipients?.length ?? 0})
        </h2>
        {!campaign.recipients?.length ? (
          <p className="px-6 py-8 text-center text-sm text-gray-400">
            No recipients added
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs font-medium uppercase text-gray-500">
              <tr>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Sent At</th>
                <th className="px-6 py-3">Opened At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {campaign.recipients.map((r) => (
                <tr key={r.id}>
                  <td className="px-6 py-3 text-gray-900">{r.email}</td>
                  <td className="px-6 py-3 text-gray-600">{r.name}</td>
                  <td className="px-6 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-6 py-3 text-gray-500">
                    {r.sent_at ? new Date(r.sent_at).toLocaleString() : "-"}
                  </td>
                  <td className="px-6 py-3 text-gray-500">
                    {r.opened_at
                      ? new Date(r.opened_at).toLocaleString()
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Schedule Modal */}
      <Modal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        title="Schedule Campaign"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Date & Time
            </label>
            <input
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => {
                setScheduleDate(e.target.value);
                setScheduleDateError("");
              }}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
            {scheduleDateError && (
              <p className="mt-1 text-xs text-red-500">{scheduleDateError}</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setScheduleOpen(false)}
              className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSchedule}
              disabled={scheduleMut.isPending}
              className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {scheduleMut.isPending && <Spinner />}
              Schedule
            </button>
          </div>
        </div>
      </Modal>

      {/* Send Confirmation Modal */}
      <Modal
        open={confirmSendOpen}
        onClose={() => setConfirmSendOpen(false)}
        title="Send Campaign"
      >
        <p className="mb-6 text-sm text-gray-600">
          Are you sure you want to send this campaign? This action cannot be
          undone.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setConfirmSendOpen(false)}
            className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sendMut.isPending}
            className="flex items-center gap-2 rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {sendMut.isPending && <Spinner />}
            Yes, Send Now
          </button>
        </div>
      </Modal>
    </div>
  );
}
