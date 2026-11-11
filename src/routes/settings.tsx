import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { LogOut } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { consumeAuthRedirect, getAuthSession, getProfile, requestPasswordReset, signIn, signOut, signUp, updatePassword, updateUsername, type AuthSession } from "@/lib/supabase";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [
    { title: "Settings — MID_NIGHT_CONFESSIONS_" },
    { name: "description", content: "Edit your profile, username, privacy and message preferences." },
    { property: "og:title", content: "Settings — MID_NIGHT_CONFESSIONS_" },
    { property: "og:description", content: "Edit your profile, username, privacy and message preferences." },
  ] }),
  component: Settings,
});

const schema = z.object({
  username: z.string().trim().min(3, "At least 3 characters.").max(20, "At most 20 characters.").regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers and _ only."),
});

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-6 rounded-2xl border border-border bg-card p-5 sm:p-6 md:grid-cols-[220px_minmax(0,1fr)]">
      <div><h2 className="font-medium">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>
      <div className="grid gap-5">{children}</div>
    </section>
  );
}
function Settings() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [mode, setMode] = useState<"signup" | "signin" | "forgot" | "reset">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [signupUsername, setSignupUsername] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const redirect = await consumeAuthRedirect();
        if (!active) return;

        if (redirect.error) {
          setMode("signin");
          setError("That email link is invalid or expired. Sign in, or request a fresh link.");
        }
        if (redirect.type === "recovery") {
          if (redirect.session) {
            setMode("reset");
            setNotice("Choose a new password for your account.");
          } else {
            setMode("signin");
            setError("That reset link has expired. Request a new one.");
          }
        }

        const current = redirect.session ?? await getAuthSession();
        if (!current || !active) return;
        setSession(current);
        const profile = await getProfile(current);
        if (active && profile) setUsername(profile.username);
        if (redirect.type === "signup") setNotice("Email confirmed. Your account is ready.");
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Couldn't load your account.");
      }
    })();
    return () => { active = false; };
  }, []);

  async function submitAuth(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const validation = schema.safeParse({ username: signupUsername.toLowerCase() });
        if (!validation.success) {
          setError(validation.error.issues[0]?.message ?? "Choose a valid username.");
          return;
        }
        const createdSession = await signUp(email, password, validation.data.username);
        if (!createdSession) {
          setNotice("Check your email to confirm your account, then sign in.");
          setMode("signin");
          setPassword("");
          return;
        }
        setSession(createdSession);
        setUsername(validation.data.username);
        setPassword("");
        setNotice("Your account is ready.");
      } else {
        const signedInSession = await signIn(email, password);
        if (!signedInSession) throw new Error("Sign-in did not return a session.");
        setSession(signedInSession);
        const profile = await getProfile(signedInSession);
        setUsername(profile?.username ?? "");
        setPassword("");
        setNotice("You're signed in.");
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Couldn't connect your account.");
    } finally {
      setBusy(false);
    }
  }

  async function sendPasswordReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await requestPasswordReset(email);
      setNotice("If an account exists for that email, a password reset link is on its way.");
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Couldn't request a password reset.");
    } finally {
      setBusy(false);
    }
  }

  async function saveNewPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (newPassword.length < 8) {
      setError("Use at least 8 characters for your new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      await updatePassword(newPassword);
      await signOut();
      setSession(null);
      setNewPassword("");
      setConfirmPassword("");
      setMode("signin");
      setNotice("Password updated. Sign in with your new password.");
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Couldn't update your password.");
    } finally {
      setBusy(false);
    }
  }

  async function saveUsername(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    const validation = schema.safeParse({ username: username.toLowerCase() });
    if (!validation.success) {
      setUsernameError(validation.error.issues[0]?.message ?? "Choose a valid username.");
      return;
    }
    setBusy(true);
    setUsernameError(null);
    try {
      await updateUsername(session, validation.data.username);
      setUsername(validation.data.username);
      setNotice("Username saved.");
    } catch (saveError) {
      setUsernameError(saveError instanceof Error ? saveError.message : "Couldn't save your username.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    setSession(null);
    setUsername("");
    setNotice("You are signed out.");
  }

  return (
    <AppShell>
      <PageHeader eyebrow="Account" title="Settings" description="Create your account and manage your anonymous link." />
      <div className="mt-6 grid gap-4">
        <Section title={session ? "Your account" : "Sign in or create an account"} description={session ? session.user.email ?? "Account connected" : "An account is needed to receive and read private messages."}>
          {session ? (
            <>
              <form onSubmit={saveUsername} noValidate className="grid gap-3">
                <Label htmlFor="username">Username</Label>
                <div className="flex items-center rounded-md border border-input bg-background/40 focus-within:ring-2 focus-within:ring-ring">
                  <span className="shrink-0 pl-3 font-mono text-sm text-muted-foreground">/u/</span>
                  <Input id="username" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} maxLength={20} aria-invalid={!!usernameError} className="border-0 bg-transparent pl-0.5 font-mono focus-visible:ring-0" />
                </div>
                {usernameError && <p role="alert" className="text-xs text-destructive">{usernameError}</p>}
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={busy}>Save username</Button>
                  {username && <Button asChild type="button" variant="secondary"><Link to="/u/$username" params={{ username }}>Open profile</Link></Button>}
                  <Button type="button" variant="ghost" onClick={handleSignOut}><LogOut className="size-4" /> Sign out</Button>
                </div>
              </form>
            </>
          ) : (
            <>
              {(mode === "signup" || mode === "signin") && <div role="group" aria-label="Account mode" className="inline-flex rounded-lg border border-border p-1">
                <button type="button" onClick={() => { setMode("signup"); setError(null); setNotice(null); }} aria-pressed={mode === "signup"} className={`rounded-md px-3 py-1.5 text-sm ${mode === "signup" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Create account</button>
                <button type="button" onClick={() => { setMode("signin"); setError(null); setNotice(null); }} aria-pressed={mode === "signin"} className={`rounded-md px-3 py-1.5 text-sm ${mode === "signin" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Sign in</button>
              </div>}
              <form onSubmit={mode === "forgot" ? sendPasswordReset : mode === "reset" ? saveNewPassword : submitAuth} className="grid gap-3">
                {mode === "signup" && <div className="grid gap-2"><Label htmlFor="signup-username">Username</Label><Input id="signup-username" value={signupUsername} onChange={(event) => setSignupUsername(event.target.value.toLowerCase())} autoComplete="username" minLength={3} maxLength={20} required /></div>}
                {(mode === "signup" || mode === "signin" || mode === "forgot") && <div className="grid gap-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></div>}
                {(mode === "signup" || mode === "signin") && <div className="grid gap-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} required /></div>}
                {mode === "reset" && <>
                  <div className="grid gap-2"><Label htmlFor="new-password">New password</Label><Input id="new-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength={8} required /></div>
                  <div className="grid gap-2"><Label htmlFor="confirm-password">Confirm new password</Label><Input id="confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={8} required /></div>
                </>}
                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
                <Button type="submit" disabled={busy}>{busy ? "Working…" : mode === "signup" ? "Create account" : mode === "signin" ? "Sign in" : mode === "forgot" ? "Send reset link" : "Save new password"}</Button>
              </form>
              {mode === "signin" && <button type="button" className="justify-self-start text-sm text-primary hover:underline" onClick={() => { setMode("forgot"); setError(null); setNotice(null); }}>Forgot password?</button>}
              {(mode === "forgot" || mode === "reset") && <button type="button" className="justify-self-start text-sm text-primary hover:underline" onClick={() => { setMode("signin"); setError(null); setNotice(null); }}>Back to sign in</button>}
            </>
          )}
          {notice && session && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
        </Section>
      </div>
    </AppShell>
  );
}
