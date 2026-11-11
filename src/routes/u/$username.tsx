import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { messageSchema, MESSAGE_MAX } from "@/lib/message-schema";
import { sendAnonymousMessage } from "@/lib/supabase";
import { AppShell } from "@/components/app/AppShell";
import { EmptyState } from "@/components/app/EmptyState";

export const Route = createFileRoute("/u/$username")({
  head: ({ params }) => ({ meta: [
    { title: `@${params.username} — MID_NIGHT_CONFESSIONS_` },
    { name: "description", content: `Send @${params.username} an anonymous message.` },
    { property: "og:title", content: `@${params.username} on MID_NIGHT_CONFESSIONS_` },
    { property: "og:description", content: `Send @${params.username} an anonymous message.` },
  ] }),
  component: Profile,
});

function Profile() {
  const { username } = Route.useParams();
  return (
    <AppShell>
      <div className="flex flex-col items-center text-center">
        <div className="grid size-20 place-items-center rounded-full bg-gradient-brand text-2xl font-semibold shadow-glow">{username[0]?.toUpperCase()}</div>
        <h1 className="mt-4 text-2xl font-semibold">@{username}</h1>
      </div>
      <MessageForm username={username} />
      <section className="mx-auto mt-10 max-w-xl">
        <h2 className="mb-4 text-lg font-semibold">Public confessions</h2>
        <EmptyState icon={Sparkles} title="Nothing shared yet" description={`Confessions @${username} approves will appear here.`} />
      </section>
    </AppShell>
  );
}

function MessageForm({ username }: { username: string }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = messageSchema.safeParse({ message: text });
    if (!r.success) { setError(r.error.issues[0]?.message ?? "Invalid message."); setNotice(null); return; }
    setError(null);
    setNotice(null);
    setSending(true);
    try {
      await sendAnonymousMessage(username, r.data.message);
      setText("");
      setNotice("Your message was sent anonymously.");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Couldn't send your message.");
    } finally {
      setSending(false);
    }
  }
  return (
    <form onSubmit={submit} noValidate className="mx-auto mt-8 max-w-xl rounded-3xl glass p-5">
      <label htmlFor="msg" className="text-sm font-medium">Send @{username} an anonymous message</label>
      <Textarea id="msg" value={text} maxLength={MESSAGE_MAX} aria-invalid={!!error} aria-describedby="msg-help"
        onChange={(e) => { setText(e.target.value); setError(null); setNotice(null); }}
        placeholder="Say what you've never said…" className="mt-3 min-h-32 resize-none rounded-xl bg-background/40" />
      <div id="msg-help" className="mt-2 flex items-center justify-between gap-3 text-xs">
        <span className={error ? "text-destructive" : "text-muted-foreground"} role={error ? "alert" : notice ? "status" : undefined}>{error ?? notice ?? "Your identity stays hidden."}</span>
        <span className="shrink-0 tabular-nums text-muted-foreground">{text.length}/{MESSAGE_MAX}</span>
      </div>
      <Button type="submit" disabled={sending} className="mt-4 w-full rounded-xl"><Send className="size-4" /> {sending ? "Sending…" : "Send anonymously"}</Button>
    </form>
  );
}
