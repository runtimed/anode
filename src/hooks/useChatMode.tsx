import { createContext, useContext, ReactNode } from "react";
import { useLocalStorage } from "react-use";

export interface ChatModeState {
  enabled: boolean;
}

const defaultChatModeState: ChatModeState = {
  enabled: false,
};

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
  storageKey?: string;
}

export function ChatModeProvider({
  children,
  storageKey = "anode-chat-mode-state",
}: ChatModeProviderProps) {
  const [chatModeState, setChatModeState] = useLocalStorage<ChatModeState>(
    storageKey,
    defaultChatModeState
  );

  const contextValue: ChatModeContextType = {
    chatModeState: chatModeState || defaultChatModeState,
    setChatModeState: (state) => {
      if (typeof state === "function") {
        setChatModeState((prev) => state(prev || defaultChatModeState));
      } else {
        setChatModeState(state);
      }
    },
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
        ...context.chatModeState,
        enabled,
      });
    },
  };
}
