export function ProgressBar({
  label,
  value,
  color = "bg-blue-600",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  const pct = Math.round(value * 100);
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900">{pct}%</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-gray-200">
        <div
          className={`h-2.5 rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
