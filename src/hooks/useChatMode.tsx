import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@livestore/react";
import { useStore } from "@livestore/react";
import { queryDb } from "@livestore/livestore";
import { tables, events } from "@runtimed/schema";

export interface ChatModeState {
  enabled: boolean;
}

interface ChatModeContextType {
  chatModeState: ChatModeState;
  setChatModeState: (
    state: ChatModeState | ((prev: ChatModeState) => ChatModeState)
  ) => void;
}

const ChatModeContext = createContext<ChatModeContextType | undefined>(
  undefined
);

interface ChatModeProviderProps {
  children: ReactNode;
}

export function ChatModeProvider({ children }: ChatModeProviderProps) {
  const { store } = useStore();

  // Query the chatMode metadata from the notebook
  const chatModeMetadata = useQuery(
    queryDb(
      tables.notebookMetadata.select().where({ key: "chatMode" }).limit(1)
    )
  );

  // Get the current chat mode state from metadata
  const chatModeState: ChatModeState = {
    enabled: chatModeMetadata[0]?.value === "true" || false,
  };

  const setChatModeState = (
    state: ChatModeState | ((prev: ChatModeState) => ChatModeState)
  ) => {
    if (!store) return;

    const newState = typeof state === "function" ? state(chatModeState) : state;

    // Commit the metadata change to the store
    store.commit(
      events.notebookMetadataSet({
        key: "chatMode",
        value: newState.enabled.toString(),
      })
    );
  };

  const contextValue: ChatModeContextType = {
    chatModeState,
    setChatModeState,
  };

  return (
    <ChatModeContext.Provider value={contextValue}>
      {children}
    </ChatModeContext.Provider>
  );
}

export function useChatMode() {
  const context = useContext(ChatModeContext);

  if (context === undefined) {
    throw new Error("useChatMode must be used within a ChatModeProvider");
  }

  return {
    enabled: context.chatModeState.enabled,
    setEnabled: (enabled: boolean) => {
      context.setChatModeState({
        enabled,
      });
    },
  };
}
