export function PageHeader({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return (
    <div>
      {eyebrow && <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-700">{eyebrow}</p>}
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
      {description && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>}
    </div>
  );
}
