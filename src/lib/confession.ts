export type Confession = {
  id: string;
  text: string;
  category: string;
  createdAt: string;
  unread?: boolean;
  isPublic?: boolean;
  myReactions?: Partial<Record<"heart" | "laugh" | "fire", boolean>>;
  reactions: { heart: number; laugh: number; fire: number };
};

export function timeAgo(iso: string, now = Date.now()) {
  const m = Math.max(1, Math.round((now - new Date(iso).getTime()) / 60000));
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
