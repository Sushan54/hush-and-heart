import { useEffect, useState } from "react";
import { Ban, Check, Flag, Flame, Heart, Laugh, MoreHorizontal, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { type Confession, timeAgo } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

type Action = "read" | "delete" | "report" | "block";
const reactionIcons = { heart: Heart, laugh: Laugh, fire: Flame } as const;
const reactionLabels = { heart: "Love", laugh: "Funny", fire: "Fire" } as const;

export function ConfessionCard({ c, onAction, actions = ["report"], showReactions = true }: { c: Confession; onAction?: (a: Action, c: Confession) => void; actions?: Action[]; showReactions?: boolean }) {
  const [mine, setMine] = useState<Record<string, boolean>>({});
  const [ago, setAgo] = useState("");
  useEffect(() => setAgo(timeAgo(c.createdAt)), [c.createdAt]);

  return (
    <article className={cn("group relative rounded-2xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30", c.unread ? "border-primary/40" : "border-border")}>
      {c.unread && <span className="absolute left-0 top-6 h-8 w-0.5 rounded-full bg-gradient-brand" aria-hidden />}
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <span className="shrink-0 rounded-full border border-border px-2.5 py-0.5 text-foreground/80">{c.category}</span>
          <time dateTime={c.createdAt} className="truncate">{ago}</time>
          {c.unread && <span className="flex items-center gap-1 text-accent"><span className="size-1.5 rounded-full bg-accent" />New</span>}
        </div>
        {onAction && (
          <DropdownMenu>
            <DropdownMenuTrigger aria-label="Message actions" className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {actions.includes("read") && c.unread && <DropdownMenuItem onSelect={() => onAction("read", c)}><Check /> Mark as read</DropdownMenuItem>}
              {actions.includes("report") && <DropdownMenuItem onSelect={() => onAction("report", c)}><Flag /> Report</DropdownMenuItem>}
              {actions.includes("block") && <DropdownMenuItem onSelect={() => onAction("block", c)}><Ban /> Block sender</DropdownMenuItem>}
              {actions.includes("delete") && (<><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => onAction("delete", c)}><Trash2 /> Delete</DropdownMenuItem></>)}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>
      <p className="mt-4 text-[15px] leading-relaxed">{c.text}</p>
      {showReactions && <footer className="mt-5 flex flex-wrap gap-2">
        {(Object.keys(reactionIcons) as (keyof typeof reactionIcons)[]).map((k) => {
          const Icon = reactionIcons[k];
          const on = !!mine[k];
          return (
            <button key={k} type="button" aria-pressed={on} aria-label={`${reactionLabels[k]} reaction`}
              onClick={() => setMine((m) => ({ ...m, [k]: !m[k] }))}
              className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs tabular-nums transition-all active:scale-95", on ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground")}>
              <Icon className={cn("size-3.5", on && "text-primary")} />{c.reactions[k] + (on ? 1 : 0)}
            </button>
          );
        })}
      </footer>}
    </article>
  );
}
