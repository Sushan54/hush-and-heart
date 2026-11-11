const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const sessionKey = "hush-and-heart-session";

export type AuthUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

export type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: AuthUser;
};

export type InboxMessage = {
  id: string;
  content: string;
  created_at: string;
  is_public: boolean;
  read_at: string | null;
};

type AuthResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
  user?: AuthUser;
  msg?: string;
  message?: string;
  error_description?: string;
};

function getConfig() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase isn't configured. Add its URL and anon key to .env.local.");
  }
  return { supabaseUrl, supabaseAnonKey };
}

function getAuthRedirectUrl() {
  return new URL(import.meta.env.BASE_URL, window.location.origin).toString();
}

async function readError(response: Response) {
  const body = await response.json().catch(() => null) as AuthResponse | null;
  return body?.msg ?? body?.message ?? body?.error_description ?? "Supabase request failed.";
}

function saveSession(response: AuthResponse) {
  if (!response.access_token || !response.refresh_token || !response.user) return null;
  const session: AuthSession = {
    access_token: response.access_token,
    refresh_token: response.refresh_token,
    expires_at: response.expires_at ?? Math.floor(Date.now() / 1000) + (response.expires_in ?? 3600),
    user: response.user,
  };
  window.localStorage.setItem(sessionKey, JSON.stringify(session));
  return session;
}

async function authRequest(path: string, body: Record<string, unknown>) {
  const { supabaseUrl, supabaseAnonKey } = getConfig();
  const response = await fetch(`${supabaseUrl}/auth/v1/${path}`, {
    method: "POST",
    headers: { apikey: supabaseAnonKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await readError(response));
  return await response.json() as AuthResponse;
}

export async function consumeAuthRedirect() {
  if (typeof window === "undefined" || !window.location.hash) {
    return { session: null, type: null, error: null };
  }

  const params = new URLSearchParams(window.location.hash.slice(1));
  const type = params.get("type");
  const error = params.get("error_description") ?? params.get("error");
  const clearHash = () => window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}`);

  if (error) {
    clearHash();
    return { session: null, type, error };
  }

  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (!accessToken || !refreshToken) return { session: null, type, error: null };

  const { supabaseUrl, supabaseAnonKey } = getConfig();
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(await readError(response));

  const user = await response.json() as AuthUser;
  const session: AuthSession = {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: Number(params.get("expires_at")) || Math.floor(Date.now() / 1000) + Number(params.get("expires_in") ?? 3600),
    user,
  };
  window.localStorage.setItem(sessionKey, JSON.stringify(session));
  clearHash();
  return { session, type, error: null };
}

async function dataRequest(path: string, session?: AuthSession, init: RequestInit = {}) {
  const { supabaseUrl, supabaseAnonKey } = getConfig();
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${session?.access_token ?? supabaseAnonKey}`,
      ...(init.body && { "Content-Type": "application/json" }),
      ...init.headers,
    },
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.status === 204 ? null : response.json();
}

export async function signUp(email: string, password: string, username: string) {
  const redirect = encodeURIComponent(getAuthRedirectUrl());
  const response = await authRequest(`signup?redirect_to=${redirect}`, { email, password, data: { username } });
  return saveSession(response);
}

export async function resendConfirmation(email: string) {
  await authRequest("resend", {
    type: "signup",
    email,
    options: { emailRedirectTo: getAuthRedirectUrl() },
  });
}

export async function requestPasswordReset(email: string) {
  const redirect = encodeURIComponent(getAuthRedirectUrl());
  await authRequest(`recover?redirect_to=${redirect}`, { email });
}

export async function updatePassword(password: string) {
  const session = await getAuthSession();
  if (!session) throw new Error("This reset link has expired. Request a new one.");

  const { supabaseUrl, supabaseAnonKey } = getConfig();
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: "PUT",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });
  if (!response.ok) throw new Error(await readError(response));
}

export async function signIn(email: string, password: string) {
  const response = await authRequest("token?grant_type=password", { email, password });
  return saveSession(response);
}

export async function getAuthSession() {
  if (typeof window === "undefined") return null;
  const saved = window.localStorage.getItem(sessionKey);
  if (!saved) return null;

  let session: AuthSession;
  try {
    session = JSON.parse(saved) as AuthSession;
  } catch {
    window.localStorage.removeItem(sessionKey);
    return null;
  }
  if (session.expires_at > Math.floor(Date.now() / 1000) + 30) return session;

  try {
    const refreshed = await authRequest("token?grant_type=refresh_token", { refresh_token: session.refresh_token });
    return saveSession(refreshed);
  } catch {
    window.localStorage.removeItem(sessionKey);
    return null;
  }
}

export async function signOut() {
  const session = await getAuthSession();
  if (session) {
    const { supabaseUrl, supabaseAnonKey } = getConfig();
    await fetch(`${supabaseUrl}/auth/v1/logout`, {
      method: "POST",
      headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${session.access_token}` },
    }).catch(() => undefined);
  }
  window.localStorage.removeItem(sessionKey);
}

export async function getProfile(session: AuthSession) {
  const profiles = await dataRequest(`profiles?select=id,username&id=eq.${encodeURIComponent(session.user.id)}&limit=1`, session) as { id: string; username: string }[];
  return profiles[0] ?? null;
}

export async function updateUsername(session: AuthSession, username: string) {
  await dataRequest(`profiles?id=eq.${encodeURIComponent(session.user.id)}`, session, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ username }),
  });
}

export async function getInboxMessages(session: AuthSession) {
  return await dataRequest("messages?select=id,content,created_at,is_public,read_at&order=created_at.desc", session) as InboxMessage[];
}

export async function markMessageRead(session: AuthSession, id: string) {
  await dataRequest(`messages?id=eq.${encodeURIComponent(id)}`, session, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ read_at: new Date().toISOString() }),
  });
}

export async function deleteInboxMessage(session: AuthSession, id: string) {
  await dataRequest(`messages?id=eq.${encodeURIComponent(id)}`, session, { method: "DELETE" });
}

export async function sendAnonymousMessage(username: string, message: string) {
  const { supabaseUrl, supabaseAnonKey } = getConfig();

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/submit_anonymous_message`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_username: username, p_message: message }),
  });

  if (response.status === 404) {
    throw new Error("Supabase is connected, but its anonymous message endpoint isn't set up yet.");
  }
  if (response.status === 401 || response.status === 403) {
    throw new Error("Supabase rejected the message. Check its anonymous access policy.");
  }
  if (!response.ok) {
    throw new Error("Couldn't send your message. Please try again later.");
  }
}