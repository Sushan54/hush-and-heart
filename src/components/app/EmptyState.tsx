import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border px-6 py-14 text-center">
      <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-32 w-64 rounded-full bg-primary/15 blur-3xl" />
      <div className="relative grid size-14 place-items-center rounded-2xl glass">
        <Icon className="size-6 text-accent" />
      </div>
      <h3 className="relative mt-5 text-base font-semibold">{title}</h3>
      <p className="relative mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="relative mt-6">{action}</div>}
    </div>
  );
}
