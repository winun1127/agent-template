"use client";

import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@/components/ai-elements/attachments";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
  usePromptInputAttachments,
  PromptInputHeader,
} from "@/components/ai-elements/prompt-input";
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { CopyCheckIcon, CopyIcon, TriangleAlertIcon } from "lucide-react";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, UIMessage } from "ai";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Loader } from "./ai-elements/loader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const CopyMessageAction = ({
  text,
  id,
  copiedId,
  onCopy,
}: {
  text: string;
  id: string;
  copiedId: string | null;
  onCopy: (id: string, text: string) => void;
}) => (
  <MessageAction onClick={() => onCopy(id, text)} label="Copy" tooltip="Copy">
    {copiedId === id ? <CopyCheckIcon /> : <CopyIcon />}
  </MessageAction>
);

const PromptInputAttachmentsDisplay = () => {
  const attachments = usePromptInputAttachments();
  const handleRemove = useCallback(
    (id: string) => attachments.remove(id),
    [attachments],
  );

  if (attachments.files.length === 0) return null;

  return (
    <Attachments variant="inline">
      {attachments.files.map((attachment) => (
        <Attachment
          data={attachment}
          key={attachment.id}
          onRemove={() => handleRemove(attachment.id)}
        >
          <AttachmentPreview />
          <AttachmentRemove />
        </Attachment>
      ))}
    </Attachments>
  );
};

export default function Chat({
  id,
  initialMessages = [],
}: {
  id?: string;
  initialMessages?: UIMessage[];
} = {}) {
  const createChat = useMutation(api.chat.createChat);
  const [chatId, setChatId] = useState<string | undefined>(id);
  const [input, setInput] = useState("");
  const pendingMessageRef = useRef<PromptInputMessage | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = useCallback((id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const { messages, sendMessage, status, error } = useChat({
    id: chatId,
    messages: chatId ? initialMessages : [],
    transport: new DefaultChatTransport({
      api: "/api/agent",
      prepareSendMessagesRequest({ messages, id }) {
        return {
          body: {
            id,
            message: messages[messages.length - 1],
          },
        };
      },
    }),
  });

  useEffect(() => {
    if (chatId && pendingMessageRef.current) {
      const pending = pendingMessageRef.current;
      pendingMessageRef.current = null;
      sendMessage({
        text: pending.text || "Sent with attachments",
        files: pending.files,
      });
    }
  }, [chatId, sendMessage]);

  const handleSubmit = async (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);
    if (!(hasText || hasAttachments)) return;

    if (!chatId) {
      const id = await createChat();
      pendingMessageRef.current = message;
      window.history.pushState(null, "", `/chat/${id}`);
      setChatId(id);
      setInput("");
      return;
    }

    sendMessage({
      text: message.text || "Sent with attachments",
      files: message.files,
    });
    setInput("");
  };

  return (
    <div className="max-w-4xl mx-auto p-6 relative size-full overflow-hidden">
      <div className="flex flex-col h-full">
        <Conversation>
          <ConversationContent className="gap-4">
            {messages.length === 0 ? (
              <ConversationEmptyState />
            ) : (
              messages.map((message) => {
                return (
                  <Fragment key={message.id}>
                    {message.parts.map((part, i) => {
                      switch (part.type) {
                        case "file":
                          return (
                            <Message
                              key={`${message.id}-${i}`}
                              from={message.role}
                            >
                              <Attachment
                                className="group-[.is-user]:ml-auto"
                                data={{
                                  ...part,
                                  id: `${message.id}-file-${i}`,
                                }}
                              >
                                <AttachmentPreview />
                              </Attachment>
                            </Message>
                          );
                        case "text":
                          return (
                            <Fragment key={`${message.id}-${i}`}>
                              <Message from={message.role}>
                                <MessageContent>
                                  <MessageResponse>{part.text}</MessageResponse>
                                </MessageContent>
                              </Message>
                              {message.role === "user" && (
                                <MessageActions className="justify-end">
                                  <CopyMessageAction
                                    text={part.text}
                                    id={`${message.id}-${i}`}
                                    copiedId={copiedId}
                                    onCopy={handleCopy}
                                  />
                                </MessageActions>
                              )}
                              {message.role === "assistant" && (
                                <MessageActions>
                                  <CopyMessageAction
                                    text={part.text}
                                    id={`${message.id}-${i}`}
                                    copiedId={copiedId}
                                    onCopy={handleCopy}
                                  />
                                </MessageActions>
                              )}
                            </Fragment>
                          );
                        case "dynamic-tool": {
                          return (
                            <Tool key={`${message.id}-${i}`}>
                              <ToolHeader
                                type={part.type}
                                state={part.state}
                                toolName={part.toolName}
                              />
                              <ToolContent>
                                <ToolInput input={part.input} />
                                <ToolOutput
                                  output={part.output}
                                  errorText={part.errorText}
                                />
                              </ToolContent>
                            </Tool>
                          );
                        }
                        default:
                          return null;
                      }
                    })}
                  </Fragment>
                );
              })
            )}
            {status === "submitted" && (
              <div className="justify-start">
                <Loader />
              </div>
            )}
            {error && (
              <Alert variant="destructive" className="bg-destructive/10">
                <TriangleAlertIcon />
                <AlertTitle>Something went wrong</AlertTitle>
                <AlertDescription>
                  {error.message ?? "Please try again."}
                </AlertDescription>
              </Alert>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <PromptInput
          onSubmit={handleSubmit}
          className="mt-4"
          globalDrop
          multiple
        >
          <PromptInputHeader>
            <PromptInputAttachmentsDisplay />
          </PromptInputHeader>
          <PromptInputBody>
            <PromptInputTextarea
              onChange={(e) => setInput(e.target.value)}
              value={input}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger />
                <PromptInputActionMenuContent>
                  <PromptInputActionAddAttachments />
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>
            </PromptInputTools>
            <PromptInputSubmit disabled={!input && !status} status={status} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
