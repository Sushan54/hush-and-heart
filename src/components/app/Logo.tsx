import { Link } from "@tanstack/react-router";
import { MoonStar } from "lucide-react";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="group inline-flex items-center gap-2.5" aria-label="MID_NIGHT_CONFESSIONS_ home">
      <span className="grid size-8 place-items-center rounded-lg bg-gradient-brand shadow-glow transition-transform group-hover:rotate-[-8deg]">
        <MoonStar className="size-4 text-primary-foreground" />
      </span>
      {!compact && (
        <span className="font-mono text-[13px] font-medium tracking-tight text-foreground">
          MID_NIGHT<span className="text-muted-foreground">_</span>CONFESSIONS<span className="animate-pulse text-primary">_</span>
        </span>
      )}
    </Link>
  );
}
