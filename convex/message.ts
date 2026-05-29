import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { MutationCtx, QueryCtx, mutation, query } from "./_generated/server";

async function requireChatOwner(ctx: QueryCtx | MutationCtx, chatId: Id<"chat">) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  const chat = await ctx.db.get(chatId);
  if (!chat || chat.userId !== identity.tokenIdentifier) throw new Error("Not found");
}

export const getMessages = query({
  args: { chatId: v.id("chat") },
  handler: async (ctx, { chatId }) => {
    await requireChatOwner(ctx, chatId);

    const messages = await ctx.db
      .query("message")
      .withIndex("by_chat_created", (q) => q.eq("chatId", chatId))
      .order("asc")
      .collect();

    const result = [];
    for (const msg of messages) {
      const parts = await ctx.db
        .query("part")
        .withIndex("by_message_order", (q) => q.eq("messageId", msg._id))
        .order("asc")
        .collect();

      result.push({
        id: msg.messageId,
        role: msg.role,
        parts: parts.map((p) => p.data),
        createdAt: msg.createdAt,
      });
    }
    return result;
  },
});

export const saveMessages = mutation({
  args: {
    chatId: v.id("chat"),
    message: v.array(
      v.object({
        id: v.string(),
        role: v.union(v.literal("user"), v.literal("assistant")),
        parts: v.array(v.any()),
        createdAt: v.optional(v.number()),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, { chatId, message }) => {
    await requireChatOwner(ctx, chatId);

    const existing = await ctx.db
      .query("message")
      .withIndex("by_chat", (q) => q.eq("chatId", chatId))
      .collect();

    for (const msg of existing) {
      const parts = await ctx.db
        .query("part")
        .withIndex("by_message_order", (q) => q.eq("messageId", msg._id))
        .collect();
      for (const p of parts) await ctx.db.delete(p._id);
      await ctx.db.delete(msg._id);
    }

    const now = Date.now();
    for (const msg of message) {
      const msgId = await ctx.db.insert("message", {
        chatId,
        messageId: msg.id,
        role: msg.role,
        createdAt: msg.createdAt ?? now,
      });

      for (let i = 0; i < msg.parts.length; i++) {
        await ctx.db.insert("part", {
          messageId: msgId,
          order: i,
          data: msg.parts[i] as Record<string, unknown>,
        });
      }
    }

    return null;
  },
});
