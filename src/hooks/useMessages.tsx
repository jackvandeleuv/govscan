// hooks/useMessages.js
import { useState } from "react";
import type { Message } from "~/types/conversation";

const useMessages = () => {
  const [messages, setMessages] = useState<Message[]>([]);

  const systemSendMessages = (messages: Message[]) => {
    const newMessages = [...messages];
    for (const message of messages) {
      const existingMessageIndex = newMessages.findIndex(
        (msg) => msg.id === message.id
      );

      if (existingMessageIndex > -1) {
        newMessages[existingMessageIndex] = message;
      } else {
        newMessages.push(message);
      }
    }
    setMessages(newMessages);
  };

  return {
    messages,
    setMessages,
    systemSendMessages,
  };
};

export default useMessages;
