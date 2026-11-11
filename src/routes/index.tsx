import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, EyeOff, Link2, MessageCircleHeart, ShieldCheck, Sparkles, Flag } from "lucide-react";
import { Logo } from "@/components/app/Logo";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MID_NIGHT_CONFESSIONS_ — Anonymous messages, honestly" },
      { name: "description", content: "Get your own anonymous link and receive honest messages from friends, followers and strangers." },
      { property: "og:title", content: "MID_NIGHT_CONFESSIONS_" },
      { property: "og:description", content: "Some things are easier left anonymous. Get your link." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: EyeOff, title: "Truly anonymous", text: "Senders never need an account. We never reveal who wrote what." },
  { icon: ShieldCheck, title: "You stay in control", text: "Filter words, pause your link, and block senders whenever you need." },
  { icon: Sparkles, title: "Share what you love", text: "Approve your favourite confessions and show them on your public profile." },
  { icon: Flag, title: "Safety first", text: "Report harmful messages in one tap. Moderation built in from day one." },
];
const steps = [
  { n: "01", title: "Claim your link", text: "Pick a username and get a link like midnight.app/u/you." },
  { n: "02", title: "Share it anywhere", text: "Drop it in your bio, story or group chat." },
  { n: "03", title: "Read the truth", text: "Messages land in your private inbox. Reply, keep, or delete." },
];
const faqs = [
  { q: "Can people see who sent a message?", a: "No. Sender identities are never shown to you or anyone else." },
  { q: "Do senders need an account?", a: "No. Anyone with your link can write to you in seconds." },
  { q: "Are my messages public?", a: "Only if you choose to approve them for your profile. Everything else stays private." },
  { q: "What if someone is abusive?", a: "You can delete, report and block from any message. Reported content is reviewed." },
];

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-grid" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-primary/25 blur-[140px]" />
      <div className="pointer-events-none absolute top-40 right-[-10%] h-72 w-72 rounded-full bg-accent/20 blur-[120px]" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link to="/explore">Explore</Link></Button>
          <Button asChild size="sm" className="rounded-full"><Link to="/dashboard">Open app</Link></Button>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-4xl px-5 pb-24 pt-16 text-center sm:pt-24">
        <span className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs text-muted-foreground">
          <span className="size-1.5 animate-pulse rounded-full bg-accent" /> Open after dark
        </span>
        <h1 className="mt-7 text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
          Some things are easier left <span className="text-gradient">anonymous.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-pretty text-base text-muted-foreground sm:text-lg">
          Get a personal link. Share it anywhere. Receive honest messages from people who would never say it to your face.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="h-12 w-full rounded-full px-7 shadow-glow transition-transform hover:-translate-y-0.5 sm:w-auto">
            <Link to="/dashboard">Get your anonymous link <ArrowRight className="ml-1 size-4" /></Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 w-full rounded-full border-border bg-transparent px-7 sm:w-auto">
            <Link to="/explore">Explore confessions</Link>
          </Button>
        </div>

        <div className="relative mx-auto mt-20 max-w-md text-left">
          <div className="absolute -inset-px rounded-3xl bg-gradient-brand opacity-40 blur-xl" />
          <div className="relative rounded-3xl glass p-5">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-full bg-gradient-brand font-semibold">?</div>
              <div><p className="text-sm font-medium">Anonymous</p><p className="text-xs text-muted-foreground">Example message</p></div>
            </div>
            <p className="mt-4 text-[15px] leading-relaxed">"I've wanted to tell you this for a year — your playlist got me through finals. Thank you."</p>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-5 py-20">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Features</p>
        <h2 className="mt-3 max-w-lg text-3xl font-semibold tracking-tight">Built for honesty. Designed for safety.</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="group rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-primary/40">
              <f.icon className="size-5 text-accent transition-colors group-hover:text-primary" />
              <h3 className="mt-5 font-medium">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-5 py-20">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">How it works</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight">Three steps to midnight.</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="rounded-2xl glass p-6">
              <span className="font-mono text-sm text-gradient">{s.n}</span>
              <h3 className="mt-4 text-lg font-medium">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-3xl px-5 py-20">
        <h2 className="text-center text-3xl font-semibold tracking-tight">Questions, answered</h2>
        <Accordion type="single" collapsible className="mt-8">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`f${i}`} className="border-border">
              <AccordionTrigger className="text-left hover:no-underline">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-20">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-10 text-center sm:p-16">
          <div className="pointer-events-none absolute inset-0 bg-gradient-brand opacity-10" />
          <MessageCircleHeart className="relative mx-auto size-8 text-accent" />
          <h2 className="relative mt-4 text-3xl font-semibold tracking-tight">Ready to hear the truth?</h2>
          <Button asChild size="lg" className="relative mt-8 rounded-full px-7"><Link to="/dashboard"><Link2 className="mr-1 size-4" /> Get your link</Link></Button>
        </div>
      </section>

      <footer className="relative z-10 border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-muted-foreground sm:flex-row">
          <Logo />
          <nav className="flex gap-6"><Link to="/explore" className="hover:text-foreground">Explore</Link><Link to="/dashboard" className="hover:text-foreground">Dashboard</Link><Link to="/settings" className="hover:text-foreground">Settings</Link></nav>
          <p>© 2026 MID_NIGHT_CONFESSIONS_</p>
        </div>
      </footer>
    </div>
  );
}
