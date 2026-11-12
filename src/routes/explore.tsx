import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Compass } from "lucide-react";
import { toast } from "sonner";
import { ConfessionCard } from "@/components/app/ConfessionCard";
import { demoExplore } from "@/lib/demo-data";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/explore")({
  head: () => ({ meta: [
    { title: "Explore confessions — MID_NIGHT_CONFESSIONS_" },
    { name: "description", content: "Browse trending and recent public anonymous confessions." },
    { property: "og:title", content: "Explore confessions — MID_NIGHT_CONFESSIONS_" },
    { property: "og:description", content: "Browse trending and recent public anonymous confessions." },
  ] }),
  component: Explore,
});

const categories = ["All", "Love", "Friendship", "School", "Work", "Funny", "Deep"];

function Explore() {
  const [cat, setCat] = useState("All");
  const [tab, setTab] = useState("trending");
  const score = (c: (typeof demoExplore)[number]) => c.reactions.heart + c.reactions.laugh + c.reactions.fire;
  const list = demoExplore.filter((c) => cat === "All" || c.category === cat).sort((a, b) => tab === "trending" ? score(b) - score(a) : b.createdAt.localeCompare(a.createdAt));
  return (
    <AppShell>
      <PageHeader eyebrow="Public feed" title="Explore" description="Confessions their owners chose to share." />
      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        <TabsList><TabsTrigger value="trending">Trending</TabsTrigger><TabsTrigger value="recent">Recent</TabsTrigger></TabsList>
      </Tabs>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Categories">
        {categories.map((c) => (
          <button key={c} onClick={() => setCat(c)} aria-pressed={cat === c}
            className={cn("shrink-0 rounded-full border px-4 py-1.5 text-sm transition-all", cat === c ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground")}>{c}</button>
        ))}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {list.length === 0 ? (
          <div className="md:col-span-2"><EmptyState icon={Compass} title={`No ${cat} confessions yet`} description="Try another category." /></div>
        ) : list.map((c) => (
          <ConfessionCard key={c.id} c={c} actions={["report"]} onAction={() => toast("Reporting isn't available yet", { description: "No report was sent." })} />
        ))}
      </div>
    </AppShell>
  );
}
