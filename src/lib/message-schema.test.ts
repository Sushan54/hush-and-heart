import { describe, expect, it } from "vitest";
import { messageSchema } from "./message-schema";
describe("anonymous message", () => {
  it("rejects blank", () => expect(messageSchema.safeParse({ message: "   " }).success).toBe(false));
  it("rejects over 500 chars", () => expect(messageSchema.safeParse({ message: "a".repeat(501) }).success).toBe(false));
  it("accepts normal text", () => expect(messageSchema.safeParse({ message: "hello there" }).success).toBe(true));
});
