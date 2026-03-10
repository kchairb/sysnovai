interface StatCardProps {
  label: string;
  value: string;
  trend: string;
}

export function StatCard({ label, value, trend }: StatCardProps) {
  return (
    <article className="premium-panel premium-interactive relative overflow-hidden p-5">
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-accent/80 via-accent/25 to-transparent" />
      <p className="premium-page-kicker">{label}</p>
      <p className="mt-2 text-[1.65rem] font-semibold leading-tight">{value}</p>
      <p className="mt-1 text-[12px] text-secondary">{trend}</p>
    </article>
  );
}
