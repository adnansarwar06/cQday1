"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { Thread } from "@assistant-ui/react-ui";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { config, isDemoMode, getApiUrl } from "@/lib/config";

/**
 * Provides the chat runtime and renders the chat thread.
 * This component sets up the connection to the backend API.
 */
function ChatProvider() {
  const runtime = useChatRuntime({
    api: getApiUrl(config.api.endpoints.chat),
  });

  if (isDemoMode()) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-blue-500 font-bold">
          Demo Mode: API URL not configured. Update baseUrl in src/lib/config.ts to connect to backend.
        </p>
      </div>
    );
  }

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