import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, Eye, Inbox, Link2, MessageSquare, Share2, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
import { ConfessionCard } from "@/components/app/ConfessionCard";
import { getAuthSession, getInboxMessages, getProfile, type AuthSession, type InboxMessage } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [
    { title: "Dashboard — MID_NIGHT_CONFESSIONS_" },
    { name: "description", content: "Your anonymous link, message stats and latest confessions." },
    { property: "og:title", content: "Dashboard — MID_NIGHT_CONFESSIONS_" },
    { property: "og:description", content: "Your anonymous link, message stats and latest confessions." },
  ] }),
  component: Dashboard,
});

function Dashboard() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getAuthSession().then(async (current) => {
      if (!active) return;
      setSession(current);
      if (!current) return;
      const [profile, inbox] = await Promise.all([getProfile(current), getInboxMessages(current)]);
      if (active) {
        setUsername(profile?.username ?? null);
        setMessages(inbox);
      }
    }).catch((loadError: unknown) => {
      if (active) toast.error(loadError instanceof Error ? loadError.message : "Couldn't load your dashboard.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const profileUrl = username && typeof window !== "undefined" ? `${window.location.origin}/u/${username}` : null;
  const stats = [
    { label: "Total messages", icon: MessageSquare, value: session ? String(messages.length) : "—" },
    { label: "Unread", icon: Inbox, value: session ? String(messages.filter((message) => !message.read_at).length) : "—" },
    { label: "Profile views", icon: Eye, value: "—" },
    { label: "Approved public", icon: Sparkles, value: session ? String(messages.filter((message) => message.is_public).length) : "—" },
  ];

  async function copyLink() {
    if (!profileUrl) return;
    try {
      await navigator.clipboard.writeText(profileUrl);
      toast.success("Profile link copied");
    } catch {
      toast.error("Couldn't copy the profile link");
    }
  }

  async function shareLink() {
    if (!profileUrl) return;
    if (!navigator.share) return copyLink();
    try {
      await navigator.share({ title: "Send me an anonymous message", url: profileUrl });
    } catch (shareError) {
      if (shareError instanceof Error && shareError.name !== "AbortError") toast.error("Couldn't share the profile link");
    }
  }

  return (
    <AppShell>
      <PageHeader eyebrow="Good evening" title="Welcome to the night shift." description="Your link, your inbox, your rules." />

      <section className="relative mt-8 overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-primary/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-10 size-56 rounded-full bg-accent/15 blur-3xl" />
        <div className="relative">
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Link2 className="size-4 text-accent" /> Your anonymous link</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1 truncate rounded-xl glass px-4 py-3 font-mono text-sm text-muted-foreground">{profileUrl ?? (loading ? "Loading profile…" : "Create an account to get your link")}</div>
            <div className="flex gap-2">
              <Button disabled={!profileUrl} onClick={copyLink} className="flex-1 rounded-xl sm:flex-none"><Copy className="size-4" /> Copy</Button>
              <Button disabled={!profileUrl} onClick={shareLink} variant="secondary" className="flex-1 rounded-xl sm:flex-none"><Share2 className="size-4" /> Share</Button>
            </div>
          </div>
          {!profileUrl && <p className="mt-3 text-xs text-muted-foreground"><Link to="/settings" className="text-primary hover:underline">Create an account</Link> to get a shareable link.</p>}
        </div>
      </section>

      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Message statistics">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30">
            <s.icon className="size-4 text-muted-foreground" />
            <p className="mt-4 text-3xl font-semibold tabular-nums">{s.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent messages</h2>
          <Link to="/inbox" className="text-sm text-muted-foreground hover:text-foreground">View inbox →</Link>
        </div>
        {session && messages.length > 0 ? messages.slice(0, 3).map((message) => (
          <ConfessionCard key={message.id} showReactions={false} actions={[]} c={{
            id: message.id,
            text: message.content,
            category: "Anonymous",
            createdAt: message.created_at,
            unread: !message.read_at,
            reactions: { heart: 0, laugh: 0, fire: 0 },
          }} />
        )) : (
          <EmptyState icon={MessageSquare} title={session ? "It's quiet… for now" : "Your inbox starts with an account"} description={session ? "When someone sends you an anonymous message, it will appear here. Share your link to get started." : "Create an account to get your personal message link."} />
        )}
      </section>
    </AppShell>
  );
}
