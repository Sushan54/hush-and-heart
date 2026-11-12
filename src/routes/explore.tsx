import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Compass } from "lucide-react";
import { ConfessionCard } from "@/components/app/ConfessionCard";
import type { Confession } from "@/lib/confession";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAuthSession, getPublicConfessions, setPublicConfessionReaction, type AuthSession } from "@/lib/supabase";

export const Route = createFileRoute("/explore")({
  head: () => ({ meta: [
    { title: "Explore confessions — MID_NIGHT_CONFESSIONS_" },
    { name: "description", content: "Browse trending and recent public anonymous confessions." },
    { property: "og:title", content: "Explore confessions — MID_NIGHT_CONFESSIONS_" },
    { property: "og:description", content: "Browse trending and recent public anonymous confessions." },
  ] }),
  component: Explore,
});

function Explore() {
  const [tab, setTab] = useState("trending");
  const [session, setSession] = useState<AuthSession | null>(null);
  const [items, setItems] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const currentSession = await getAuthSession();
        const confessions = await getPublicConfessions(currentSession);
        if (active) {
          setSession(currentSession);
          setItems(confessions.map((confession) => ({
            id: confession.id,
            text: confession.content,
            category: "Shared",
            createdAt: confession.created_at,
            reactions: confession.reactions,
            myReactions: confession.my_reactions,
          })));
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Couldn't load public confessions.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const score = (confession: Confession) => confession.reactions.heart + confession.reactions.laugh + confession.reactions.fire;
  const list = [...items].sort((a, b) => tab === "trending"
    ? score(b) - score(a) || b.createdAt.localeCompare(a.createdAt)
    : b.createdAt.localeCompare(a.createdAt));
  return (
    <AppShell>
      <PageHeader eyebrow="Public feed" title="Explore" description="Anonymous confessions their owners chose to share." />
      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        <TabsList><TabsTrigger value="trending">Trending</TabsTrigger><TabsTrigger value="recent">Recent</TabsTrigger></TabsList>
      </Tabs>
      {!session && <p className="mt-4 text-sm text-muted-foreground">Sign in on <Link to="/settings" className="text-primary hover:underline">Settings</Link> to save your reactions.</p>}
      {loading && <p className="mt-6 text-sm text-muted-foreground">Loading public confessions…</p>}
      {error && <p role="alert" className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {!loading && !error && list.length === 0 && (
          <div className="md:col-span-2"><EmptyState icon={Compass} title="No public confessions yet" description="Confessions their owners choose to share will appear here." /></div>
        )}
        {list.map((confession) => (
          <ConfessionCard
            key={confession.id}
            c={confession}
            onReaction={session
              ? (reaction, active) => setPublicConfessionReaction(session, confession.id, reaction, active)
              : undefined}
          />
        ))}
      </div>
    </AppShell>
  );
}
