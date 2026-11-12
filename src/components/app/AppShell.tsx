import { Link, useRouterState } from "@tanstack/react-router";
import { Compass, Inbox, LayoutGrid, MessageSquare, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { to: "/inbox", label: "Inbox", icon: Inbox },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/polls", label: "Polls", icon: MessageSquare },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function NavLink({ item, mobile }: { item: (typeof nav)[number]; mobile?: boolean }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const active = path.startsWith(item.to);
  const Icon = item.icon;
  const cls = mobile
    ? cn(
        "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] transition-colors",
        active ? "text-foreground" : "text-muted-foreground",
      )
    : cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
        active
          ? "bg-sidebar-accent text-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
      );
  const inner = (
    <>
      {!mobile && active && (
        <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-gradient-brand" />
      )}
      <Icon
        className={cn(
          "size-[18px] transition-transform group-hover:scale-110",
          active && "text-primary",
        )}
      />
      <span>{item.label}</span>
    </>
  );
  return (
    <Link to={item.to} className={cls} aria-current={active ? "page" : undefined}>
      {inner}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 lg:flex">
        <div className="px-2">
          <Logo />
        </div>
        <nav className="mt-10 flex flex-col gap-1" aria-label="Main">
          {nav.map((n) => (
            <NavLink key={n.to} item={n} />
          ))}
        </nav>
        <div className="mt-auto rounded-2xl glass p-4">
          <p className="text-sm font-medium">Make your link yours</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create an account to receive private messages.
          </p>
          <Link
            to="/settings"
            className="mt-3 inline-flex text-xs font-medium text-primary hover:underline"
          >
            Set up account
          </Link>
        </div>
      </aside>
      <header className="sticky top-0 z-30 flex h-14 items-center border-b border-border glass px-4 lg:hidden">
        <Logo />
      </header>
      <main className="px-4 pb-28 pt-6 sm:px-6 lg:ml-64 lg:px-10 lg:pb-12 lg:pt-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border glass pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {nav.map((n) => (
          <NavLink key={n.to} item={n} mobile />
        ))}
      </nav>
    </div>
  );
}
