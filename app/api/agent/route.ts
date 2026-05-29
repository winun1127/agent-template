import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  UIMessage,
} from "ai";
import { createAgent } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { toBaseMessages, toUIMessageStream } from "@ai-sdk/langchain";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { fetchAuthMutation, fetchAuthQuery } from "@/lib/auth-server";

const model = new ChatOpenAI({
  model: "gpt-5.4-nano",
});

const agent = createAgent({
  model,
  tools: [],
  systemPrompt: "You are a helpful assistant.",
});

export async function POST(req: Request) {
  try {
    const { id, message }: { id: string; message: UIMessage } =
      await req.json();

    const previousMessages = (await fetchAuthQuery(api.message.getMessages, {
      chatId: id as Id<"chat">,
    })) as UIMessage[];

    if (previousMessages.length === 0) {
      const firstText = message.parts.find((p) => p.type === "text");
      const title =
        firstText && "text" in firstText
          ? String(firstText.text).slice(0, 50)
          : "Untitled";
      await fetchAuthMutation(api.chat.updateChat, {
        chatId: id as Id<"chat">,
        patch: { title },
      });
    }

    const messages = [...previousMessages, message];

    const langchainMessages = await toBaseMessages(messages);

    const agentStream = await agent.stream(
      { messages: langchainMessages },
      { streamMode: ["values", "messages"] },
    );

    const stream = createUIMessageStream({
      execute: ({ writer }) => {
        writer.merge(toUIMessageStream(agentStream));
      },
      originalMessages: messages,
      onFinish: async ({ messages }) => {
        await fetchAuthMutation(api.message.saveMessages, {
          chatId: id as Id<"chat">,
          message: messages.map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            parts: m.parts,
          })),
        });
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    console.error("Agent route error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
