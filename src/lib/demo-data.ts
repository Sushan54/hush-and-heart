// DEMO DATA ONLY — sample content for previewing the UI. Not real user messages.
export type Confession = {
  id: string;
  text: string;
  category: string;
  createdAt: string; // ISO
  unread?: boolean;
  reactions: { heart: number; laugh: number; fire: number };
};

export const demoInbox: Confession[] = [
  { id: "i1", text: "You were the first person who made me feel welcome here. I never said thank you.", category: "Friendship", createdAt: "2026-11-11T02:14:00Z", unread: true, reactions: { heart: 0, laugh: 0, fire: 0 } },
  { id: "i2", text: "Your laugh in the back of class is the only reason I survive Mondays.", category: "Funny", createdAt: "2026-11-10T22:40:00Z", unread: true, reactions: { heart: 0, laugh: 0, fire: 0 } },
  { id: "i3", text: "I think you should send that portfolio. You're better than you believe.", category: "Work", createdAt: "2026-11-09T19:05:00Z", reactions: { heart: 0, laugh: 0, fire: 0 } },
];

export const demoExplore: Confession[] = [
  { id: "e1", text: "I still keep the ticket from our first concert in my wallet. Four years later.", category: "Love", createdAt: "2026-11-11T01:02:00Z", reactions: { heart: 248, laugh: 3, fire: 41 } },
  { id: "e2", text: "I pretend to understand wine at dinners. I just like the red one.", category: "Funny", createdAt: "2026-11-10T23:30:00Z", reactions: { heart: 32, laugh: 410, fire: 12 } },
  { id: "e3", text: "I quit my job last week and haven't told my parents yet.", category: "Work", createdAt: "2026-11-10T18:12:00Z", reactions: { heart: 120, laugh: 8, fire: 96 } },
  { id: "e4", text: "Sometimes I reread old group chats just to feel like we're still close.", category: "Friendship", createdAt: "2026-11-09T21:44:00Z", reactions: { heart: 305, laugh: 4, fire: 18 } },
  { id: "e5", text: "I got a B on the exam everyone failed and I've been unbearable since.", category: "School", createdAt: "2026-11-09T15:20:00Z", reactions: { heart: 44, laugh: 188, fire: 70 } },
  { id: "e6", text: "I'm not afraid of dying. I'm afraid of never having really lived.", category: "Deep", createdAt: "2026-11-08T03:03:00Z", reactions: { heart: 512, laugh: 0, fire: 133 } },
];

export function timeAgo(iso: string, now = Date.now()) {
  const m = Math.max(1, Math.round((now - new Date(iso).getTime()) / 60000));
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
