interface ModulePlaceholderProps {
  title: string;
  description: string;
}

export function ModulePlaceholder({ title, description }: ModulePlaceholderProps) {
  return (
    <div className="premium-panel p-6">
      <p className="premium-page-kicker">Module</p>
      <h1 className="mt-2 text-[1.7rem] font-semibold leading-tight">{title}</h1>
      <p className="mt-2 max-w-2xl text-[14px] leading-6 text-secondary">{description}</p>
    </div>
  );
}
