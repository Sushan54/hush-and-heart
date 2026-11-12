import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Vote, X } from "lucide-react";
import { toast } from "sonner";
import { AnonymousPollCard } from "@/components/app/AnonymousPollCard";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getAuthSession,
  getAnonymousPolls,
  createAnonymousPoll,
  castAnonymousPollVote,
  type AuthSession,
} from "@/lib/supabase";
import type { AnonymousPoll } from "@/lib/poll";

export const Route = createFileRoute("/polls")({
  head: () => ({
    meta: [
      { title: "Anonymous polls — MID_NIGHT_CONFESSIONS_" },
      { name: "description", content: "Create anonymous polls and vote privately." },
    ],
  }),
  component: Polls,
});

function Polls() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [polls, setPolls] = useState<AnonymousPoll[]>([]);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const currentSession = await getAuthSession();
        if (active) setSession(currentSession);
        const items = await getAnonymousPolls(currentSession);
        if (active) setPolls(items);
      } catch (loadError) {
        if (active)
          setError(loadError instanceof Error ? loadError.message : "Couldn't load polls.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function submitPoll(event: React.FormEvent) {
    event.preventDefault();
    if (!session) return;
    const cleanQuestion = question.trim();
    const cleanOptions = options.map((option) => option.trim());
    if (cleanQuestion.length < 5 || cleanQuestion.length > 200) {
      setFormError("Questions must be between 5 and 200 characters.");
      return;
    }
    if (
      cleanOptions.length < 2 ||
      cleanOptions.length > 4 ||
      cleanOptions.some((option) => option.length < 1 || option.length > 80)
    ) {
      setFormError("Add 2 to 4 options, each between 1 and 80 characters.");
      return;
    }
    if (new Set(cleanOptions.map((option) => option.toLowerCase())).size !== cleanOptions.length) {
      setFormError("Poll options must be unique.");
      return;
    }

    setCreating(true);
    setFormError(null);
    let pollId: string;
    try {
      pollId = await createAnonymousPoll(session, cleanQuestion, cleanOptions);
    } catch (createError) {
      setFormError(
        createError instanceof Error ? createError.message : "Couldn't create your poll.",
      );
      setCreating(false);
      return;
    }

    const newPoll: AnonymousPoll = {
      id: pollId,
      question: cleanQuestion,
      options: cleanOptions,
      created_at: new Date().toISOString(),
      vote_counts: cleanOptions.map(() => 0),
      total_votes: 0,
      my_vote: null,
    };
    setPolls((current) => [newPoll, ...current]);
    setQuestion("");
    setOptions(["", ""]);
    try {
      setPolls(await getAnonymousPolls(session));
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Poll created, but the list couldn't refresh.",
      );
    } finally {
      setCreating(false);
    }
    toast.success("Your poll was published anonymously.");
  }

  async function submitVote(pollId: string, optionIndex: number) {
    if (!session) return;
    setVotingId(pollId);
    try {
      await castAnonymousPollVote(session, pollId, optionIndex);
    } catch (voteError) {
      toast.error(voteError instanceof Error ? voteError.message : "Couldn't submit your vote.");
      setVotingId(null);
      return;
    }

    setPolls((current) =>
      current.map((poll) =>
        poll.id === pollId
          ? {
              ...poll,
              my_vote: optionIndex,
              total_votes: poll.total_votes + 1,
              vote_counts: poll.vote_counts.map(
                (count, index) => count + (index === optionIndex ? 1 : 0),
              ),
            }
          : poll,
      ),
    );
    toast.success("Your vote was submitted anonymously.");
    try {
      setPolls(await getAnonymousPolls(session));
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Your vote was saved, but results couldn't refresh.",
      );
    } finally {
      setVotingId(null);
    }
  }

  function updateOption(index: number, value: string) {
    setOptions((current) =>
      current.map((option, optionIndex) => (optionIndex === index ? value : option)),
    );
    setFormError(null);
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Community"
        title="Anonymous polls"
        description="Poll creators stay hidden. Each signed-in account gets one anonymous vote per poll."
      />
      {!session && (
        <p className="mt-4 text-sm text-muted-foreground">
          <Link to="/settings" className="text-primary hover:underline">
            Sign in
          </Link>{" "}
          to create polls and vote anonymously.
        </p>
      )}
      {session && (
        <form
          onSubmit={submitPoll}
          className="mt-6 grid gap-4 rounded-2xl border border-border bg-card p-5"
        >
          <h2 className="font-medium">Create a poll</h2>
          <div className="grid gap-2">
            <label htmlFor="poll-question" className="text-sm text-muted-foreground">
              Question
            </label>
            <Input
              id="poll-question"
              value={question}
              onChange={(event) => {
                setQuestion(event.target.value);
                setFormError(null);
              }}
              maxLength={200}
              required
              placeholder="Ask the community…"
            />
          </div>
          <div className="grid gap-2">
            <span className="text-sm text-muted-foreground">Options</span>
            {options.map((option, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  aria-label={`Poll option ${index + 1}`}
                  value={option}
                  onChange={(event) => updateOption(index, event.target.value)}
                  maxLength={80}
                  required
                  placeholder={`Option ${index + 1}`}
                />
                {options.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove option ${index + 1}`}
                    onClick={() =>
                      setOptions((current) =>
                        current.filter((_, optionIndex) => optionIndex !== index),
                      )
                    }
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
            ))}
            {options.length < 4 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="justify-self-start"
                onClick={() => setOptions((current) => [...current, ""])}
              >
                <Plus className="size-4" /> Add option
              </Button>
            )}
          </div>
          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}
          <Button type="submit" disabled={creating}>
            {creating ? "Publishing…" : "Publish anonymously"}
          </Button>
        </form>
      )}
      {error && (
        <p
          role="alert"
          className="mt-5 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {loading && <p className="mt-6 text-sm text-muted-foreground">Loading polls…</p>}
      <section className="mt-6 grid gap-4 md:grid-cols-2" aria-label="Community polls">
        {!loading && !error && polls.length === 0 && (
          <div className="md:col-span-2">
            <EmptyState
              icon={Vote}
              title="No polls yet"
              description="Start a conversation by creating the first anonymous poll."
            />
          </div>
        )}
        {polls.map((poll) => (
          <AnonymousPollCard
            key={poll.id}
            poll={poll}
            signedIn={!!session}
            busy={votingId === poll.id}
            onVote={submitVote}
          />
        ))}
      </section>
    </AppShell>
  );
}
