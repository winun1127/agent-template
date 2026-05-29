import { v } from "convex/values";
import { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";

async function requireAuth(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  return identity.tokenIdentifier;
}

export const createChat = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    return await ctx.db.insert("chat", { title: "Untitled", userId });
  },
});

export const getChat = query({
  args: { chatId: v.id("chat") },
  returns: v.union(v.object({ id: v.string(), title: v.string() }), v.null()),
  handler: async (ctx, { chatId }) => {
    const userId = await requireAuth(ctx);
    const chat = await ctx.db.get(chatId);
    if (!chat || chat.userId !== userId) return null;
    return { id: chat._id, title: chat.title };
  },
});

export const getChats = query({
  args: {},
  returns: v.array(v.object({ id: v.string(), title: v.string() })),
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const chats = await ctx.db
      .query("chat")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    return chats.map((c) => ({ id: c._id, title: c.title }));
  },
});

export const updateChat = mutation({
  args: {
    chatId: v.id("chat"),
    patch: v.object({ title: v.optional(v.string()) }),
  },
  returns: v.null(),
  handler: async (ctx, { chatId, patch }) => {
    const userId = await requireAuth(ctx);
    const chat = await ctx.db.get(chatId);
    if (!chat || chat.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(chatId, patch);
    return null;
  },
});

export const deleteChat = mutation({
  args: { chatId: v.id("chat") },
  returns: v.null(),
  handler: async (ctx, { chatId }) => {
    const userId = await requireAuth(ctx);
    const chat = await ctx.db.get(chatId);
    if (!chat || chat.userId !== userId) throw new Error("Not found");

    const messages = await ctx.db
      .query("message")
      .withIndex("by_chat", (q) => q.eq("chatId", chatId))
      .collect();

    for (const msg of messages) {
      const parts = await ctx.db
        .query("part")
        .withIndex("by_message_order", (q) => q.eq("messageId", msg._id))
        .collect();
      for (const part of parts) await ctx.db.delete(part._id);
      await ctx.db.delete(msg._id);
    }

    await ctx.db.delete(chatId);
    return null;
  },
});
