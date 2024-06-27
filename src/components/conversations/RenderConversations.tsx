import React, { useEffect, useRef, useState } from "react";
import { MESSAGE_STATUS, MessageSubProcess, ROLE } from "~/types/conversation";
import type { BackendCitation, Citation } from "~/types/conversation";
import type { Message, SubQuestion } from "~/types/conversation";
import { LoadingSpinner } from "~/components/basics/Loading";
import { PiCaretDownBold } from "react-icons/pi";
import { HiOutlineChatAlt2 } from "react-icons/hi";
import { usePdfFocus } from "~/context/pdf";
import { AiFillExclamationCircle } from "react-icons/ai";
import { Document } from "~/types/document";
import { borderColors } from "~/utils/colors";
import { formatDisplayDate } from "~/utils/timezone";
import ChatSkeleton from "./ChatSkeleton";


interface CitationDisplayProps {
  citation: Citation;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}
const CitationDisplay: React.FC<CitationDisplayProps> = ({ citation, setCollapsed }) => {
  const { setPdfFocusState } = usePdfFocus();
  const handleCitationClick = (documentId: string, pageNumber: number) => {
    setPdfFocusState({ documentId, pageNumber, citation });
  };

  return (
    <div
      className={`mx-1.5 mb-2 min-h-[25px] min-w-[160px] cursor-pointer rounded border-l-8 bg-gray-00 p-1 hover:bg-gray-15  ${
        borderColors[citation.color]
      }`}
      onClick={() => {
          handleCitationClick(citation.documentId, citation.pageNumber);
          setCollapsed(false);
        }
      }
    >
      <div className="flex items-center">
        <div className="mr-1 text-xs font-bold text-black">
          {`Page ${citation.pageNumber}`}{" "}
        </div>
        <div className="mr-2 text-xs font-bold text-black">
          {/* ({citation.displayDate}) */}
        </div>
        {/* <div className="text-[10px]">p. {citation.pageNumber}</div> */}
      </div>
      <p className="line-clamp-8 text-[10px] font-light leading-3">
        {citation.snippet}
      </p>
    </div>
  );
};

interface SubProcessDisplayProps {
  subProcesses: MessageSubProcess[];
  isOpen: boolean;
  toggleOpen: () => void;
  messageId: string;
  showSpinner: boolean;
  documents: Document[];
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}

type SubQuestionItem = {
  subQuestion: SubQuestion,
  subProcessIndex: number,
  subQuestionIndex: number
};

const SubProcessDisplay: React.FC<SubProcessDisplayProps> = ({
  subProcesses,
  isOpen,
  toggleOpen,
  messageId,
  documents,
  showSpinner = true,
  setCollapsed
}) => {
  const subQuestions: SubQuestionItem[] = [];
  subProcesses?.forEach((subProcess, subProcessIndex) => {
    if (subProcess.metadata_map?.sub_question) {
      subQuestions.push({
        subQuestion: subProcess.metadata_map?.sub_question,
        subProcessIndex,
        subQuestionIndex: subQuestions.length,
      });
    } else if (subProcess.metadata_map?.sub_questions) {
      subProcess.metadata_map?.sub_questions.forEach((subQuestion) => {
        subQuestions.push({
          subQuestion,
          subProcessIndex,
          subQuestionIndex: subQuestions.length,
        });
      });
    }
  });


  function getMetadataString(citations: BackendCitation[]): string {
    if (!documents || citations.length === 0) return '';
    const cite = citations[0];
    const doc = documents.find((doc) => doc.id === cite!.document_id);
    if (!doc) return '';
    return `${doc.geography} (${doc.year}, ${doc.language})`;
  }


  return (
    <div key={`${messageId}-sub-process`} className="mt-4 w-full rounded ">
      <div
        className="flex w-max cursor-pointer items-center rounded p-1 font-nunito text-sm text-gray-90 hover:bg-gray-00"
        onClick={() => toggleOpen()}
      >
        View Citations
        <div className="px-3 py-2">
          {isOpen ? (
            <PiCaretDownBold />
          ) : (
            <PiCaretDownBold className="-rotate-90" />
          )}
        </div>
      </div>
      {isOpen && (
        <>
          <div className="ml-4 border-l border-l-gray-30 pb-1 pl-4 font-nunito text-[11px] font-light text-gray-60">
            {subQuestions.length > 0 && (
                <div
                  key={`${messageId}-sub-process`}
                  className="text-gray-60"
                >
                  <div>
                    {subQuestions.sort((a, b) => a.subQuestion.question.toLowerCase().localeCompare(b.subQuestion.question.toLowerCase()))
                      .map(({subQuestion, subQuestionIndex, subProcessIndex}) => {
                        const hasCitations = !!subQuestion.citations;
                        return (
                          <div
                            key={`${messageId}-${subProcessIndex}-${subQuestionIndex}`}
                          >
                            <div className="flex w-11/12 py-2 flex-col rounded border">
                              <div className="rounded-t border-b bg-gray-00 p-2 font-bold text-gray-90">
                                {subQuestion.citations ? 
                                  getMetadataString(subQuestion.citations)
                                  :
                                  subQuestion.question
                                }
                              </div>
                            
                              {hasCitations && (
                                <div className=" mr-2 py-3 px-1 flex w-full overflow-x-scroll pl-2 ">
                                  {subQuestion.citations?.sort((a, b) => a.score - b.score).map(
                                    (citation, citationIndex) => {
                                      // get snippet and display date from documentId
                                      const citationDocument = documents.find(
                                        (doc) => doc.id === citation.document_id
                                      );
                                      if (!citationDocument) {
                                        return;
                                      }
                                      const yearDisplay =
                                        citationDocument.quarter
                                          ? `${citationDocument.year} Q${citationDocument.quarter}`
                                          : `${citationDocument.year}`;
                                      return (
                                        <CitationDisplay
                                          key={`${messageId}-${subProcessIndex}-${subQuestionIndex}-${citationIndex}`}
                                          citation={
                                            {
                                              documentId: citation.document_id,
                                              snippet: citation.text,
                                              pageNumber: citation.page_number,
                                              ticker: citationDocument?.docType,
                                              displayDate: yearDisplay,
                                              color: citationDocument.color,
                                            } as Citation
                                          }
                                          setCollapsed={setCollapsed}
                                        />
                                      );
                                    }
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )
            }
          </div>
          <div className="pb-2"></div>
        </>
      )}
    </div>
  );
};


interface UserDisplayProps {
  message: Message;
  showLoading: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}
const UserDisplay: React.FC<UserDisplayProps> = ({ message, showLoading, setCollapsed }) => {
  return (
    <>
      <div className="flex border-r bg-gray-00 pb-4">
        <div className="mt-4 w-1/5 flex-grow text-right font-nunito text-gray-60">
          <div className="flex items-center justify-center">
            {formatDisplayDate(message.created_at)}
          </div>
        </div>
        <div className="mt-4 w-4/5 pr-3 font-nunito font-bold text-gray-90">
          {message.content}
        </div>
      </div>
      {showLoading && (
        <div className="flex border-b-2 pb-4">
          <div className="w-1/5"></div>
          <div className="w-4/5">
            <SubProcessDisplay
              key={`${message.id}-loading-sub-process`}
              messageId={message.id}
              subProcesses={[]}
              isOpen={false}
              // eslint-disable-next-line @typescript-eslint/no-empty-function
              toggleOpen={() => {}}
              showSpinner={true}
              documents={[]}
              setCollapsed={setCollapsed}
            />
          </div>
        </div>
      )}
    </>
  );
};

const ErrorMessageDisplay = () => {
  return (
    <div className="mt-2 flex w-80 items-center rounded border border-red-500 bg-red-100 bg-opacity-20 p-1">
      <div className="ml-2">
        <AiFillExclamationCircle className="fill-red-500" size={20} />
      </div>
      <div className="ml-4 text-red-400">
        Error: unable to load chat response
      </div>
    </div>
  );
};

interface AssistantDisplayProps {
  message: Message;
  documents: Document[];
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}
const AssistantDisplay: React.FC<AssistantDisplayProps> = ({
  message,
  documents,
  setCollapsed,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const isMessageSuccessful = message.status === MESSAGE_STATUS.SUCCESS;
  const isMessageError = message.status === MESSAGE_STATUS.ERROR;

  useEffect(() => {
    if (isMessageSuccessful) {
      setIsExpanded(false);
    }
  }, [isMessageSuccessful]);
  return (
    <div className="border-b pb-4">
      <div className="flex ">
        <div className="w-1/5"></div>
        <div className="w-4/5">
          {!isMessageError && (
            <div className="flex flex-col">
              <SubProcessDisplay
                key={`${message.id}-sub-process`}
                subProcesses={message.sub_processes || []}
                isOpen={isExpanded}
                toggleOpen={() => setIsExpanded((prev) => !prev)}
                showSpinner={!isMessageSuccessful}
                messageId={message.id}
                documents={documents}
                setCollapsed={setCollapsed}
              />
            </div>
          )}
          {isMessageError && <ErrorMessageDisplay />}
        </div>
      </div>

      {!isMessageError && (
        <>
          <div className="flex items-center justify-center">
            <div className="my-3 w-11/12 border-[.5px]"></div>
          </div>
          <div className="flex ">
            <div className="w-1/5"></div>
            <div className="w-4/5">
              <div className="relative mb-2 mt-2 pr-3 font-nunito whitespace-pre-wrap font-bold text-gray-90">
                {<div className="bg-white p-4 rounded-lg shadow">{message.content}</div>}
              </div>
              <p className="flex items-center justify-start p-1 text-xs text-gray-60">
                Large language models are not always accurate. Check important information
                against the contents of relevant documents.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

interface IRenderConversation {
  messages: Message[];
  documents: Document[];
  setUserMessage: (str: string) => void;
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  isMessagePending: boolean;
}

export const RenderConversations: React.FC<IRenderConversation> = ({
  messages,
  documents,
  setUserMessage,
  collapsed,
  setCollapsed,
  isMessagePending
}) => {

  const lastElementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (lastElementRef.current) {
      lastElementRef.current.scrollIntoView();
    }
  }, [messages]);

  const showLoading = messages[messages.length - 1]?.role === ROLE.USER;
  return (
    <div className="box-border flex h-full flex-col justify-start font-nunito text-sm text-[#2B3175]">
      {messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .map((message, index) => {
          let display;
          if (message.role == ROLE.ASSISTANT) {
            display = (
              <AssistantDisplay
                message={message}
                key={`${message.id}-answer-${index}`}
                documents={documents}
                setCollapsed={setCollapsed}
              />
            );
          } else if (message.role == ROLE.USER) {
            display = (
              <UserDisplay
                message={message}
                key={`${message.id}-question-${index}-user`}
                showLoading={index === messages.length - 1 ? showLoading : false}
                setCollapsed={setCollapsed}
              />
            );
          } else {
            display = <div>Sorry, there is a problem.</div>;
          }
          if (index === messages.length - 1) {
            return (
              <div className="mb-4 flex flex-col" key={`message-${message.id}`}>
                {display}
              </div>
            );
          } else {
            return (
              <div className="flex flex-col" key={`${message.id}-${index}`}>
                {display}
              </div>
            );
          }
        })}
      {messages.length > 0 && isMessagePending && (
        <>
          <ChatSkeleton />
          <ChatSkeleton />
          <ChatSkeleton />
        </>
      )}
      {messages.length === 0 && (
        <div className="flex h-full items-center justify-center ">
          <div className="flex w-full flex-col items-center justify-center">
            <div>
              <HiOutlineChatAlt2 size={40} />
            </div>
            <div className="mb-2 w-3/4 text-center text-lg font-bold">
              Ask GovScan questions about the documents you&apos;ve
              selected, such as:
            </div>
            <div className="m-auto flex w-full flex-wrap justify-center">
              <button
                onClick={() =>
                  setUserMessage("What mechanisms are in place for public input?")
                }
                className="m-1 flex-shrink rounded-full border border-gray-60 px-3 py-1 hover:bg-gray-15"
              >
                What mechanisms are in place for public input?
              </button>
              <button
                onClick={() => setUserMessage("How are different stakeholders involved in planning and implementation?")}
                className="m-1 flex-shrink rounded-full border border-gray-60 px-3 py-1 hover:bg-gray-15"
              >
                How are different stakeholders involved in planning and implementation?
              </button>
              <button
                onClick={() =>
                  setUserMessage("What measures of efficacy are specified?")
                }
                className="m-1 flex-shrink rounded-full border border-gray-60 px-3 py-1 hover:bg-gray-15"
              >
                What measures of efficacy are specified?
              </button>
            </div>
          </div>
        </div>
      )}
      <div ref={lastElementRef}></div>
    </div>
  );
};
