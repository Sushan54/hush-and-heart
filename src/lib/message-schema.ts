import { z } from "zod";
export const MESSAGE_MAX = 500;
export const messageSchema = z.object({
  message: z.string().trim().min(3, "Write at least 3 characters.").max(MESSAGE_MAX, `Keep it under ${MESSAGE_MAX} characters.`),
});
