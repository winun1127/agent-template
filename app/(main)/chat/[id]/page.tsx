import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Chat from "@/components/chat";
import { UIMessage } from "ai";
import { fetchAuthQuery } from "@/lib/auth-server";

export default async function ChatPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const messages = (await fetchAuthQuery(api.message.getMessages, {
    chatId: id as Id<"chat">,
  })) as UIMessage[];

  return <Chat id={id} initialMessages={messages} />;
}
