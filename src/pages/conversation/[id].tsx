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
import { group } from "console";
import AuthPanel from "~/components/dropdowns/AuthPanel";
import CollapseButton from "~/components/conversations/CollapseButton";
import { ResponseJSON } from "~/hooks/useDocumentSelector";

interface CitationChunkMap {
  [key: string]: CitationChunks[];
}

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

  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isMessagePending, setIsMessagePending] = useState(false);
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


  const updateCitation = async (
    convoId: string, 
    messageId: string,
    userQuery: string
  ) => {
    const result = await backendClient.fetchConversation(convoId);
    
    // Convert between document metadata and id.
    const infoToIdMap = new Map<string, string>();
    for (const doc of result.documents) {
      const key = `${doc.geography}-${doc.fullName}`;
      infoToIdMap.set(key, doc.id);
    }

    const chunks = await backendClient.fetchChunks(
      convoId,
      userQuery
    );

    const groupedChunks: CitationChunkMap = {};
    for (const chunk of chunks) {
      const key = `${chunk.company_ticker}-${chunk.doc_type}`
      if (key in groupedChunks) {
        groupedChunks[key]!.push(chunk);
      } else {
        groupedChunks[key] = [chunk];
      }
    }

    const newMessages: Message[] = [];

    Object.keys(groupedChunks).forEach(key => {
      const chunkGroup = groupedChunks[key]!;
      
      const citations = chunkGroup.map(chunk => {
        const doc_id = infoToIdMap.get(key);
        if (!doc_id) return null;

        return {
          document_id: doc_id,
          page_number: parseInt(chunk.page_label, 10),
          score: 0,
          text: chunk.text
        };
      }).filter(citation => citation !== null) as BackendCitation[];

      newMessages.push({
        id: messageId,
        content: '',
        role: ROLE.ASSISTANT,
        status: MESSAGE_STATUS.SUCCESS,
        conversationId: convoId,
        sub_processes: [{
          id: '',
          messageId: messageId,
          content: 'THIS IS WHERE CONTENT GOES',
          source: MessageSubprocessSource.PLACEHOLDER,
          metadata_map: {
            sub_question: {
              question: key.replace('-', ' | '),
              answer: "",
              citations: citations
            }
          }
        }],
        created_at: new Date("2021-06-01T12:00:00Z")
      });

    });
   
    setMessages(newMessages);
  };

  useEffect(() => {
    const fetchConversation = async (id: string) => {
      const endpoint = '/api/document';
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const response_json: ResponseJSON = await res.json(); 
      console.log('Backend response:')
      console.log(response_json)
    //   if (result.documents) {
    //     setSelectedDocuments(result.documents);
    //   }

    //   if (result.messages) {
    //     setMessages(result.messages);
    //   }
    // };
    };
    if (conversationId) {
      fetchConversation(conversationId).catch(() =>
        console.error("Conversation Load Error")
      );
    }
  }, [conversationId, setMessages]);

  
  // Keeping this in this file for now because this will be subject to change
  const submit = () => {
    if (!userMessage || !conversationId) {
      return;
    }

    setIsMessagePending(true);
    userSendMessage(userMessage);
    setUserMessage("");

    const messageEndpoint =
      backendUrl + `api/conversation/${conversationId}/message`;
    const url = messageEndpoint + `?user_message=${encodeURI(userMessage)}`;

    const events = new EventSource(url);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument
    events.onmessage = (event: MessageEvent) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument
      const parsedData: Message = JSON.parse(event.data);

      systemSendMessage(parsedData);

      if (
        parsedData.status === MESSAGE_STATUS.SUCCESS ||
        parsedData.status === MESSAGE_STATUS.ERROR
      ) {
        events.close();
        setIsMessagePending(false);

        // updateCitation(conversationId, parsedData.id, userMessage);
      }
    };
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
          submit();
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
                .catch(() => console.log("error navigating to conversation"));
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
                  onClick={toggleShareModal}
                  className="mr-3 flex items-center justify-center rounded-full border border-gray-400 p-1 px-3 text-gray-400 hover:bg-gray-15"
                >
                  <div className="text-xs font-medium">Share</div>
                  <FiShare className="ml-1" size={12} />
                </button>
                <CollapseButton 
                  onClick={togglePDF}
                />
              </div>
            </div>
            <div className={`flex max-h-[calc(100vh-114px)] ${collapsed ? 'w-full' : 'w-[44vw]'} flex-grow flex-col overflow-scroll`}>
              <RenderConversations
                messages={messages}
                documents={selectedDocuments}
                setUserMessage={setSuggestedMessage}
                collapsed={collapsed}
                setCollapsed={setCollapsed}
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
                onClick={submit}
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
