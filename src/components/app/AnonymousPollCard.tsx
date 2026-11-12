import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { type AnonymousPoll } from "@/lib/poll";
import { timeAgo } from "@/lib/confession";
import { cn } from "@/lib/utils";

export function AnonymousPollCard({
  poll,
  signedIn,
  busy,
  onVote,
}: {
  poll: AnonymousPoll;
  signedIn: boolean;
  busy: boolean;
  onVote: (pollId: string, optionIndex: number) => void;
}) {
  const [selected, setSelected] = useState<number | null>(poll.my_vote);
  const hasVoted = poll.my_vote !== null;

  useEffect(() => setSelected(poll.my_vote), [poll.id, poll.my_vote]);

  return (
    <article className="rounded-2xl border border-border bg-card p-5">
      <header className="flex items-start justify-between gap-4">
        <h2 className="font-medium leading-relaxed">{poll.question}</h2>
        <time dateTime={poll.created_at} className="shrink-0 text-xs text-muted-foreground">
          {timeAgo(poll.created_at)}
        </time>
      </header>
      <div className="mt-4 grid gap-2">
        {poll.options.map((option, index) => {
          const count = poll.vote_counts[index] ?? 0;
          const percent = poll.total_votes ? Math.round((count / poll.total_votes) * 100) : 0;
          const pressed = hasVoted ? poll.my_vote === index : selected === index;
          return (
            <button
              key={`${poll.id}-${index}`}
              type="button"
              aria-pressed={pressed}
              disabled={!signedIn || hasVoted || busy}
              onClick={() => setSelected(index)}
              className={cn(
                "relative flex min-h-11 items-center justify-between overflow-hidden rounded-xl border px-3 text-left text-sm transition-colors disabled:cursor-not-allowed",
                pressed
                  ? "border-primary/60 bg-primary/10"
                  : "border-border hover:border-primary/40",
              )}
            >
              {hasVoted && (
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 bg-primary/10"
                  style={{ width: `${percent}%` }}
                />
              )}
              <span className="relative">
                {option}
                {pressed && hasVoted && (
                  <span className="ml-2 text-xs text-primary">Your vote</span>
                )}
              </span>
              {hasVoted && (
                <span className="relative shrink-0 text-xs tabular-nums text-muted-foreground">
                  {count} · {percent}%
                </span>
              )}
            </button>
          );
        })}
      </div>
      <footer className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {poll.total_votes} {poll.total_votes === 1 ? "vote" : "votes"} · anonymous
        </span>
        {!hasVoted && signedIn && (
          <Button
            size="sm"
            disabled={selected === null || busy}
            onClick={() => selected !== null && onVote(poll.id, selected)}
          >
            {busy ? "Submitting…" : "Vote anonymously"}
          </Button>
        )}
      </footer>
    </article>
  );
}
