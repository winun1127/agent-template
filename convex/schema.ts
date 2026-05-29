import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  chat: defineTable({
    title: v.string(),
    userId: v.string(),
  }).index("by_user", ["userId"]),

  message: defineTable({
    chatId: v.id("chat"),
    messageId: v.string(), // AI SDK message id
    role: v.union(v.literal("user"), v.literal("assistant")),
    createdAt: v.number(),
  })
    .index("by_chat", ["chatId"])
    .index("by_chat_created", ["chatId", "createdAt"]),

  part: defineTable({
    messageId: v.id("message"),
    order: v.number(),
    data: v.any(), // raw UIMessage part object
  }).index("by_message_order", ["messageId", "order"]),
});
