"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { Thread } from "@assistant-ui/react-ui";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";

/**
 * Provides the chat runtime and renders the chat thread.
 * This component sets up the connection to the backend API.
 */
function ChatProvider() {
  const apiUrl = process.env.NEXT_PUBLIC_CHAT_API_URL;

  if (!apiUrl) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-red-500 font-bold">
          Error: NEXT_PUBLIC_CHAT_API_URL is not defined. Please set it in your .env.local file.
        </p>
      </div>
    );
  }

  const runtime = useChatRuntime({
    api: apiUrl,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <main className="h-screen w-full flex justify-center items-center">
        <div className="h-full w-full max-w-2xl flex flex-col gap-2 p-4">
          <Thread />
        </div>
      </main>
    </AssistantRuntimeProvider>
  );
}

export default ChatProvider; 