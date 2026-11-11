import { FlaskConical } from "lucide-react";
export function DemoBanner({ children }: { children: React.ReactNode }) {
  return (
    <div role="note" className="flex items-start gap-3 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm">
      <FlaskConical className="mt-0.5 size-4 shrink-0 text-accent" />
      <p className="text-muted-foreground"><span className="font-medium text-foreground">Demo preview.</span> {children}</p>
    </div>
  );
}
