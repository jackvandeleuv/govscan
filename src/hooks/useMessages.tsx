// hooks/useMessages.js
import { useState } from "react";
import type { Message } from "~/types/conversation";

const useMessages = () => {
  const [messages, setMessages] = useState<Message[]>([]);

  const systemSendMessages = (sentMessages: Message[]) => {
    const updatedMessages = [...messages];
    for (const sentMessage of sentMessages) {
      const existingMessageIndex = updatedMessages.findIndex(
        (msg) => msg.id === sentMessage.id
      );

      if (existingMessageIndex > -1) {
        updatedMessages[existingMessageIndex] = sentMessage;
      } else {
        updatedMessages.push(sentMessage);
      }
    }
    setMessages(updatedMessages);
  };

  return {
    messages,
    setMessages,
    systemSendMessages,
  };
};

export default useMessages;
