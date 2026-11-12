import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Inbox as InboxIcon } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { ConfessionCard } from "@/components/app/ConfessionCard";
import { Button } from "@/components/ui/button";
import { getAuthSession, getInboxMessages, markMessageRead, deleteInboxMessage, setMessagePublic, type AuthSession } from "@/lib/supabase";
import type { Confession } from "@/lib/confession";

export const Route = createFileRoute("/inbox")({
  head: () => ({ meta: [
    { title: "Inbox — MID_NIGHT_CONFESSIONS_" },
    { name: "description", content: "Read, delete, report and block anonymous messages." },
    { property: "og:title", content: "Inbox — MID_NIGHT_CONFESSIONS_" },
    { property: "og:description", content: "Read, delete, report and block anonymous messages." },
  ] }),
  component: Inbox,
});

function Inbox() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [items, setItems] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const unread = items.filter((i) => i.unread).length;

  useEffect(() => {
    let active = true;
    getAuthSession().then(async (current) => {
      if (!active) return;
      setSession(current);
      if (!current) return;
      const messages = await getInboxMessages(current);
      if (active) setItems(messages.map((message) => ({
        id: message.id,
        text: message.content,
        category: "Anonymous",
        createdAt: message.created_at,
        unread: !message.read_at,
        isPublic: message.is_public,
        reactions: { heart: 0, laugh: 0, fire: 0 },
      })));
    }).catch((loadError: unknown) => {
      if (active) setError(loadError instanceof Error ? loadError.message : "Couldn't load your inbox.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  return (
    <AppShell>
      <PageHeader eyebrow="Private" title="Inbox" description={session ? `Only you can see these messages · ${unread} unread` : "Sign in to read your private messages."} />
      {error && <p role="alert" className="mt-5 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}
      {!session && !loading && <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">Create an account or sign in to open your private inbox.</p><Button asChild><Link to="/settings">Account</Link></Button></div>}
      {loading && <p className="mt-6 text-sm text-muted-foreground">Loading inbox…</p>}
      <div className="mt-6 grid gap-4">
        {session && !loading && items.length === 0 ? (
          <EmptyState icon={InboxIcon} title="No messages yet" description="Your inbox will fill up once your link is live and people start writing to you." />
        ) : session && items.map((c) => (
          <ConfessionCard key={c.id} c={c} showReactions={false} actions={["read", "publish", "delete"]} onAction={async (action, message) => {
            try {
              if (!session) return;
              if (action === "read") {
                await markMessageRead(session, message.id);
                setItems((current) => current.map((item) => item.id === message.id ? { ...item, unread: false } : item));
              }
              if (action === "publish") {
                await setMessagePublic(session, message.id, !message.isPublic);
                setItems((current) => current.map((item) => item.id === message.id ? { ...item, isPublic: !item.isPublic } : item));
              }
              if (action === "delete") {
                await deleteInboxMessage(session, message.id);
                setItems((current) => current.filter((item) => item.id !== message.id));
              }
            } catch (actionError) {
              setError(actionError instanceof Error ? actionError.message : "Couldn't update that message.");
              return;
            }
            if (action === "read") toast("Message marked as read");
            if (action === "delete") toast("Message deleted");
            if (action === "publish") toast(message.isPublic ? "Removed from Explore" : "Shared on Explore");
          }} />
        ))}
      </div>
    </AppShell>
  );
}
