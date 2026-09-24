import { z } from "zod";

export const chatMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Message is required.")
    .max(2000, "Message is too long."),
  // Omitted: continue the account's most recent conversation (or start one
  // if it has none yet) -- the original single-thread behavior. A real id:
  // continue that specific thread. Explicit null: start a brand new thread
  // ("New Chat" button) even though the account already has others.
  sessionId: z.string().min(1).nullish(),
});
