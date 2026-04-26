import { Link } from "react-router-dom";
import { useCampaignList } from "../hooks/useCampaigns";
import { StatusBadge } from "../components/ui/StatusBadge";
import { Skeleton } from "../components/ui/Skeleton";

export function Campaigns() {
  const { data, isLoading, isError } = useCampaignList();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
        <Link
          to="/campaigns/new"
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Campaign
        </Link>
      </div>

      {isError && (
        <div className="rounded-lg bg-red-50 p-6 text-center text-sm text-red-600">
          Failed to load campaigns. Please try again.
        </div>
      )}

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="px-6 py-3">Name</th>
              <th className="px-6 py-3">Subject</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-4">
                    <Skeleton className="h-4 w-32" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-4 w-48" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-4 w-24" />
                  </td>
                </tr>
              ))}

            {!isLoading && data?.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-16 text-center"
                >
                  <p className="text-lg font-medium text-gray-400">
                    No campaigns yet
                  </p>
                  <p className="mt-1 text-sm text-gray-400">
                    Create your first campaign to get started.
                  </p>
                  <Link
                    to="/campaigns/new"
                    className="mt-4 inline-block rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Create Campaign
                  </Link>
                </td>
              </tr>
            )}

            {data?.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">
                  <Link
                    to={`/campaigns/${c.id}`}
                    className="hover:text-blue-600"
                  >
                    {c.name}
                  </Link>
                </td>
                <td className="px-6 py-4 text-gray-600">{c.subject}</td>
                <td className="px-6 py-4">
                  <StatusBadge status={c.status} />
                </td>
                <td className="px-6 py-4 text-gray-500">
                  {new Date(c.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
