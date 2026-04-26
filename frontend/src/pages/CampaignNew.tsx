import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useCreateCampaign } from "../hooks/useCampaigns";
import { Spinner } from "../components/ui/Spinner";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseEmails(raw: string): string[] {
  return raw
    .split(/[,\n]+/)
    .map((e) => e.trim())
    .filter(Boolean);
}

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
  recipient_emails_raw: z.string().refine(
    (val) => {
      const emails = parseEmails(val);
      return emails.length === 0 || emails.every((e) => emailRegex.test(e));
    },
    (val) => {
      const invalid = parseEmails(val).find((e) => !emailRegex.test(e));
      return { message: `Invalid email found: ${invalid}` };
    },
  ),
});

type FormData = z.infer<typeof schema>;

export function CampaignNew() {
  const navigate = useNavigate();
  const mutation = useCreateCampaign();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { recipient_emails_raw: "" },
  });

  const onSubmit = async (data: FormData) => {
    const recipientEmails = (data.recipient_emails_raw || "")
      .split(/[,\n]+/)
      .map((e) => e.trim())
      .filter(Boolean);

    const campaign = await mutation.mutateAsync({
      name: data.name,
      subject: data.subject,
      body: data.body,
      recipient_emails: recipientEmails,
    });
    navigate(`/campaigns/${campaign.id}`);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">New Campaign</h1>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4 rounded-lg bg-white p-6 shadow"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Campaign Name
          </label>
          <input
            {...register("name")}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Subject
          </label>
          <input
            {...register("subject")}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
          {errors.subject && (
            <p className="mt-1 text-xs text-red-500">
              {errors.subject.message}
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Body
          </label>
          <textarea
            {...register("body")}
            rows={6}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
          {errors.body && (
            <p className="mt-1 text-xs text-red-500">{errors.body.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Recipient Emails
          </label>
          <textarea
            {...register("recipient_emails_raw")}
            rows={3}
            placeholder={"alice@example.com, bob@example.com\ncharlie@example.com"}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
          {errors.recipient_emails_raw && (
            <p className="mt-1 text-xs text-red-500">
              {errors.recipient_emails_raw.message}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-400">
            Comma or newline separated (optional)
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting && <Spinner />}
            {isSubmitting ? "Creating..." : "Create Campaign"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/campaigns")}
            className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
