import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { PdfFocusProvider } from "~/context/pdf";

import type { ChangeEvent } from "react";
import DisplayMultiplePdfs from "~/components/pdf-viewer/DisplayMultiplePdfs";
import { backendUrl } from "src/config";
import { BackendCitation, MESSAGE_STATUS, Message, MessageSubprocessSource, ROLE } from "~/types/conversation";
import useMessages from "~/hooks/useMessages";
import { CitationChunks, backendClient } from "~/api/backend";
import { RenderConversations as RenderConversations } from "~/components/conversations/RenderConversations";
import { BiArrowBack } from "react-icons/bi";
import { Document } from "~/types/document";
import { FiShare } from "react-icons/fi";
import ExportLinkModal from "~/components/modals/ShareLinkModal";
import { BsArrowUpCircle } from "react-icons/bs";
import { useModal } from "~/hooks/utils/useModal";
import { useIntercom } from "react-use-intercom";
import useIsMobile from "~/hooks/utils/useIsMobile";
import { getToken } from "../../supabase/manageTokens";
import { v4 as uuidv4 } from "uuid";
import axios from 'axios';

interface CitationChunkMap {
  [key: string]: CitationChunks[];
}

interface FetchConversationJSON {
  messages?: Message[];
  documents?: Document[];
  message: string;
}

interface ChatResponse {
  message: string;
  data: Message;
}

type ErrorResponse = {
  message: string;
  [key: string]: any;
};

const MAX_USER_MESSAGE_TOKENS = 500;

export default function Conversation() {
  const router = useRouter();
  const { id } = router.query;

  const { shutdown } = useIntercom();
  useEffect(() => {
    shutdown();
  }, []);

  const { isOpen: isShareModalOpen, toggleModal: toggleShareModal } =
    useModal();

  const { isMobile } = useIsMobile();

  const [collapsed, setCollapsed] = useState<boolean>(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isMessagePending, setIsMessagePending] = useState<boolean>(false);
  const [userMessage, setUserMessage] = useState("");
  const [selectedDocuments, setSelectedDocuments] = useState<Document[]>([]);
  const { messages, userSendMessage, systemSendMessage, setMessages } =
    useMessages(conversationId || "");

  const textFocusRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    // router can have multiple query params which would then return string[]
    if (id && typeof id === "string") {
      setConversationId(id);
    }
  }, [id]);

  useEffect(() => {console.log('messages set to:'); console.log(messages)}, [messages])
  

  async function postUserMessage(
    userMessage: string,
    conversation_id: string,
    user_created_at: string
  ) {
    const token = await getToken();
    if (!token) {
      console.error('Could not get access token.')
      return;
    }

    const messageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL!}/rest/v1/message`;
  
    const headers: HeadersInit = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    };
  
    // POST user message
    void fetch(messageUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        role: ROLE.USER, 
        content: userMessage,
        conversation_id: conversation_id,
        created_at: user_created_at
      })
    });
  }

  useEffect(() => {
    const fetchConversation = async (id: string) => {
      const endpoint = '/api/fetch-conversation';

      const token = await getToken();
      if (!token) {
        console.error('Could not get access token.')
        return;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, token }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const response_json: FetchConversationJSON = await res.json() as FetchConversationJSON; 
      console.log('response json:')
      console.log(response_json)

      if (response_json.documents) {
        setSelectedDocuments(response_json.documents);
      }

      if (response_json.messages) {
        setMessages(response_json.messages);
      }
    
    };
    if (conversationId) {
      fetchConversation(conversationId).catch(() =>
        console.error("Conversation Load Error")
      );
    }
  }, [conversationId, setMessages]);

  
  const submit = async () => {
    if (!userMessage || !conversationId) return;

    if (userMessage.split(' ').length > MAX_USER_MESSAGE_TOKENS) {
      console.error('User message exceeds max size.');
      return;
    }

    const token = await getToken();
    if (!token) {
      console.error('Could not get access token.')
      return;
    }

    const assistant_message_id = uuidv4();

    const user_created_at = new Date().toISOString();

    setIsMessagePending(true);
    userSendMessage(userMessage, user_created_at);
    setUserMessage("");
    void postUserMessage(userMessage, conversationId, user_created_at);

    const num_docs = selectedDocuments.length;
    const url = `/api/chat?conversation_id=${conversationId}&message=${encodeURI(userMessage)}&num_docs=${num_docs}&assistant_message_id=${assistant_message_id}`;
    
    try {
      const response = await axios.post(url, {
        token
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000  
      });
  
      if (response.status !== 200) throw new Error(response.statusText);
  
      const parsedData: ChatResponse = response.data as ChatResponse;
      const message = parsedData.data;
      systemSendMessage(message);
      
    } catch (error) {
      console.error('Request failed:', error);
    } finally {
      setIsMessagePending(false);
    }
  };

  const handleTextChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setUserMessage(event.target.value);
  };

  useEffect(() => {
    const textarea = document.querySelector("textarea");
    if (textarea) {
      textarea.style.height = "auto";

      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [userMessage]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        if (!isMessagePending) {
          void submit();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [submit]);

  const setSuggestedMessage = (text: string) => {
    setUserMessage(text);
    if (textFocusRef.current) {
      textFocusRef.current.focus();
    }
  };

  useEffect(() => {
    if (textFocusRef.current) {
      textFocusRef.current.focus();
    }
  }, []);

  const togglePDF = () => {
    setCollapsed(!collapsed);
  }


  async function handleExport(): Promise<void> {
    const token = await getToken();
    if (!token) {
      console.error('Could not get access token.')
      return;
    }
    
    const endpoint = '/api/download-chat';

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, conversation_id: conversationId }),
    });

    if (!res.ok) {
      console.error('Failed to export chat:', res.statusText);
      return;
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat_${conversationId!}.docx`;  
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }


  if (isMobile) {
    return (
      <div className="landing-page-gradient-1 relative flex h-screen w-screen items-center justify-center">
        <div className="flex h-min w-3/4 flex-col items-center justify-center rounded border bg-white p-4">
          <div className="text-center text-xl ">
            Sorry, the mobile view of this page is currently a work in progress.
            Please switch to desktop!
          </div>
          <button
            onClick={() => {
              router
                .push(`/`)
                .catch(() => console.error("error navigating to conversation"));
            }}
            className="m-4 rounded border bg-llama-indigo px-8 py-2 font-bold text-white hover:bg-[#3B3775]"
          >
            Back Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <PdfFocusProvider>
        <div className="flex h-[100vh] w-full items-center justify-center">
          <div className={`flex h-[100vh] ${collapsed ? 'w-full' : 'w-[44vw]'} flex-col items-center border-r-2 bg-white`}>
            <div className="flex h-[44px] w-full items-center justify-between border-b-2 ">
              <div className="flex w-full items-center justify-between">
                <button
                  onClick={() => {
                    router
                      .push("/")
                      .catch(() => console.error("error navigating home"));
                  }}
                  className="ml-4 flex items-center justify-center rounded px-2 font-light text-[#9EA2B0] hover:text-gray-90"
                >
                  <BiArrowBack className="mr-1" /> Back to Document Selection
                </button>
                <button
                  onClick={(() => void handleExport())}
                  className="mr-3 flex items-center justify-center rounded-full border border-gray-400 p-1 px-3 text-gray-400 hover:bg-gray-15"
                >
                  <div className="text-xs font-medium">Export</div>
                  <FiShare className="ml-1" size={12} />
                </button>
                <button
                  onClick={togglePDF}
                  className="mr-3 flex items-center justify-center rounded-full border border-gray-400 p-1 px-3 text-gray-400 hover:bg-gray-15"
                >
                  <div className="text-xs font-medium">Toggle PDF</div>
                </button>
              </div>
            </div>
            <div className={`flex max-h-[calc(100vh-114px)] ${collapsed ? 'w-full' : 'w-[44vw]'} flex-grow flex-col overflow-scroll`}>
              <RenderConversations
                messages={messages}
                documents={selectedDocuments}
                setUserMessage={setSuggestedMessage}
                collapsed={collapsed}
                setCollapsed={setCollapsed}
                isMessagePending={isMessagePending}
              />
            </div>
            <div className="relative flex h-[70px] w-[44vw] w-full items-center border-b-2 border-t">
              <textarea
                ref={textFocusRef}
                rows={1}
                className="box-border w-full flex-grow resize-none overflow-hidden rounded px-5 py-3 pr-10 text-gray-90 placeholder-gray-60 outline-none"
                placeholder={"Start typing your question..."}
                value={userMessage}
                onChange={handleTextChange}
              />
              <button
                disabled={isMessagePending || userMessage.length === 0}
                onClick={(() => void submit())}
                className="z-1 absolute right-6 top-1/2 mb-1 -translate-y-1/2 transform rounded text-gray-90 opacity-80 enabled:hover:opacity-100 disabled:opacity-30"
              >
                <BsArrowUpCircle size={24} />
              </button>
            </div>
          </div>
          {!collapsed && <>
              <div className="h-[100vh] w-max">
                <DisplayMultiplePdfs pdfs={selectedDocuments} />
              </div>
              <ExportLinkModal
                isOpen={isShareModalOpen}
                toggleModal={toggleShareModal}
              />
            </>
          }
        </div>
    </PdfFocusProvider>
  );
}
