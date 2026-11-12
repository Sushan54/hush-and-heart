import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuthSession } from "./supabase";

const session: AuthSession = {
  access_token: "access-token",
  refresh_token: "refresh-token",
  expires_at: 4_000_000_000,
  user: { id: "user-1" },
};

async function loadSupabase(fetchMock: ReturnType<typeof vi.fn>) {
  vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");
  vi.stubGlobal("fetch", fetchMock);
  vi.resetModules();
  return await import("./supabase");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("public confession API", () => {
  it("loads public confessions through the read-only RPC", async () => {
    const records = [
      {
        id: "message-1",
        content: "A public confession",
        created_at: "2026-11-12T00:00:00Z",
        reactions: { heart: 2, laugh: 0, fire: 1 },
        my_reactions: { heart: true, laugh: false, fire: false },
      },
    ];
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(records)));
    const { getPublicConfessions } = await loadSupabase(fetchMock);

    await expect(getPublicConfessions(session)).resolves.toEqual(records);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.supabase.co/rest/v1/rpc/get_public_confessions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer access-token" }),
        body: "{}",
      }),
    );
  });

  it("saves a user's selected reaction state", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const { setPublicConfessionReaction } = await loadSupabase(fetchMock);

    await setPublicConfessionReaction(session, "message-1", "heart", true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.supabase.co/rest/v1/rpc/set_public_confession_reaction",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer access-token" }),
        body: JSON.stringify({ p_message_id: "message-1", p_reaction: "heart", p_active: true }),
      }),
    );
  });

  it("updates public visibility for an owned inbox message", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const { setMessagePublic } = await loadSupabase(fetchMock);

    await setMessagePublic(session, "message-1", true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.supabase.co/rest/v1/messages?id=eq.message-1",
      expect.objectContaining({
        method: "PATCH",
        headers: expect.objectContaining({ Authorization: "Bearer access-token" }),
        body: JSON.stringify({ is_public: true }),
      }),
    );
  });
});
