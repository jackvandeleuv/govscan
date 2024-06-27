import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";

import { FiTrash2 } from "react-icons/fi";
import GitHubButton from "react-github-btn";

import cx from "classnames";
import type { SelectOption } from "~/types/selection";

import { DocumentSelectCombobox } from "~/components/landing-page/SelectDocType";
import Select from "react-select";
import {
  MAX_SELECTED_DOCS,
  useDocumentSelector,
} from "~/hooks/useDocumentSelector";
import { backendClient } from "~/api/backend";
import { AiOutlineArrowRight, AiTwotoneCalendar } from "react-icons/ai";
import { CgFileDocument } from "react-icons/cg";
import { customReactSelectStyles } from "~/styles/react-select";
import { useIntercom } from "react-use-intercom";
import { LoadingSpinner } from "~/components/basics/Loading";
import useIsMobile from "~/hooks/utils/useIsMobile";
import AuthPanel from "../dropdowns/AuthPanel";
import { getToken } from "../../supabase/manageTokens";

interface TitleAndDropdownProps {
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>
}

interface CreateConversationResponse {
  newConversationId: string;
}

export const TitleAndDropdown: React.FC<TitleAndDropdownProps> = ({ setIsLoggedIn }) => {
  const router = useRouter();

  const { isMobile } = useIsMobile();

  const [isLoadingConversation, setIsLoadingConversation] = useState(false);

  const createConversation = async (documentIds: string[]) => {
    setIsLoadingConversation(true);
    try {
      const token = await getToken();
      if (!token) {
        console.error('Could not get access token.')
        return;
      }

      const response = await fetch('/api/create-conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentIds, token: token }), 
      });

      if (!response.ok) {
        throw new Error('Failed to create conversation');
      }

      const { newConversationId }: CreateConversationResponse = await response.json() as CreateConversationResponse;

      setIsLoadingConversation(false);
      await router.push(`conversation/${newConversationId}`);
    } catch (error) {
      console.error('Error creating conversation:', error);
      setIsLoadingConversation(false);
    }
  };

  const handleSubmit = (event: { preventDefault: () => void }) => {
    setIsLoadingConversation(true);
    event.preventDefault();

    const selectedDocumentIds = selectedDocuments.map((val) => val.id);
    void createConversation(selectedDocumentIds);
  };

  const {
    availableGeographies,
    availableDocumentTypes,
    sortedAvailableYears,
    selectedDocuments,
    selectedGeography,
    selectedDocumentType,
    selectedYear,
    setSelectedYear,
    handleAddDocument,
    handleRemoveDocument,
    isDocumentSelectionEnabled,
    isStartConversationButtonEnabled,
    yearFocusRef,
    documentTypeFocusRef,
    selectGeography,
    selectDocumentType,
    shouldFocusCompanySelect,
    setShouldFocusCompanySelect,
    sortedSelectedDocuments,
    handleAddAll,
    handleRemoveAll
  } = useDocumentSelector();

  const [selectableGeographies, setSelectableGeographies] = useState<SelectOption[]>();

  useEffect(() => {
    const uniqueGeographies = Array.from(new Set(availableGeographies.map(geo => geo.name)));
    const selectable = uniqueGeographies.map((geo) => ({
      value: geo,
      label: geo,
    }));
    setSelectableGeographies(selectable);
  }, [availableGeographies]);

  const { boot } = useIntercom();

  useEffect(() => {
    boot();
  }, []);

  return (
    <div className="landing-page-gradient-1 relative flex h-max w-screen flex-col items-center font-lora pb-16">
      <div className="flex flex-col items-end w-full p-5">
        <AuthPanel 
          setIsLoggedIn={setIsLoggedIn}
        />
      </div>
      <div className="flex flex-col items-center">
        <div className="w-4/5 text-center text-4xl">
          Search government documents with 
          <span className="font-bold"> GovScan</span>
        </div>
      </div>
      {isMobile ? (
        <div className="mt-12 flex h-1/5 w-11/12 rounded border p-4 text-center">
          <div className="text-xl font-bold">
            To start analyzing documents, please switch to a larger screen!
          </div>
        </div>
      ) : (
        <div className="mt-5 flex h-min w-11/12 max-w-[1200px] flex-col items-center justify-center rounded-lg border-2 bg-white sm:h-[400px] md:w-9/12 ">
          <div className="p-4 text-center text-xl font-bold">
            Start your conversation by selecting the documents you want to
            explore
          </div>
          <div className="h-1/8 flex w-full flex-row items-center justify-center font-nunito overflow-hidden">
            
            <div className="m-1 flex w-56 items-center">
              <DocumentSelectCombobox
                selectedItem={selectedDocumentType}
                setSelectedItem={selectDocumentType}
                availableDocuments={availableDocumentTypes}
                shouldFocusItem={shouldFocusCompanySelect}
                setFocusState={setShouldFocusCompanySelect}
              />
            </div>

            <div className="m-1 flex h-[41px] w-56 items-center bg-[#F7F7F7]">
              <div className="flex h-[41px] w-[30px] items-center justify-center bg-[#F7F7F7] pl-3">
                <CgFileDocument size={30} />
              </div>
              <div className="flex-grow">
                <Select
                  openMenuOnFocus
                  ref={documentTypeFocusRef}
                  options={selectableGeographies}
                  onChange={selectGeography}
                  getOptionLabel={(option: SelectOption) => option.label}
                  getOptionValue={(option: SelectOption) => option.value}
                  value={selectedGeography}
                  placeholder="Select Geography"
                  components={{
                    IndicatorSeparator: () => null,
                    DropdownIndicator: () => null,
                  }}
                  styles={customReactSelectStyles}
                />
              </div>
            </div>

            <div className="m-1 flex h-[41px] w-56 items-center rounded-e bg-[#F7F7F7]">
              <div className="flex h-[41px] w-[30px] items-center justify-center bg-[#F7F7F7] pl-3">
                <AiTwotoneCalendar size={30} />
              </div>
              <div className="flex-grow">
                <Select
                  openMenuOnFocus
                  ref={yearFocusRef}
                  options={sortedAvailableYears || []}
                  getOptionLabel={(option: SelectOption) => option.label}
                  getOptionValue={(option: SelectOption) => option.value}
                  onChange={setSelectedYear}
                  value={selectedYear}
                  placeholder="Select Year"
                  components={{
                    IndicatorSeparator: () => null,
                    DropdownIndicator: () => null,
                  }}
                  styles={customReactSelectStyles}
                />
              </div>
            </div>
          </div>

          <div className="h-1/8 flex w-full flex-wrap items-center justify-center font-nunito">
            <div className="relative">

              <button
                className="m-4 rounded border bg-llama-indigo px-8 py-2 text-white hover:bg-[#3B3775] disabled:bg-gray-30"
                onClick={handleAddDocument}
                disabled={!isDocumentSelectionEnabled || !selectedYear}
              >
                Add One
              </button>
              <button
              className="m-4 rounded border bg-llama-indigo px-8 py-2 text-white hover:bg-[#3B3775] disabled:bg-gray-30"
              onClick={handleAddAll}
              >
                Add Max
              </button>
              <button
                className="m-4 rounded border bg-llama-indigo px-8 py-2 text-white hover:bg-[#3B3775] disabled:bg-gray-30"
                onClick={handleRemoveAll}
              >
                Remove All
              </button>

            </div>
          </div>

          <div className="mt-2 flex h-full w-11/12 flex-col justify-start overflow-scroll px-4 ">
            {selectedDocuments.length === 0 && (
              <div className="flex flex-col items-center justify-center bg-gray-00 font-nunito text-gray-90">
                <div>
                  <CgFileDocument size={46} />
                </div>
                <div className="w-84 text-center md:w-64">
                  Use the document selector above to start adding documents
                </div>
              </div>
            )}
            {sortedSelectedDocuments.map((doc, index) => (
              <div
                key={index}
                className={cx(
                  index === 0 && "mt-2 border-t",
                  "group flex items-center justify-between border-b p-1 font-nunito font-bold text-[#868686] hover:bg-[#EAEAF7] hover:text-[#350F66] "
                )}
              >
                <div className="w-64 text-left">
                  {doc.fullName}
                </div>
                <div className="w-24 ml-2 mr-2 text-left">
                  {doc.geography}
                </div>
                <div>{doc.year}</div>
                <button
                  className="mr-4 group-hover:text-[#FF0000]"
                  onClick={() => handleRemoveDocument(index)}
                >
                  <FiTrash2 size={24} />
                </button>
              </div>
            ))}
          </div>

          <div className="h-1/8 mt-2 flex w-full items-center justify-center rounded-lg bg-gray-00">            
            <div className="flex flex-wrap items-center justify-center">
              <>
                <div className="w-48 font-nunito md:ml-8 ">
                  Added{" "}
                  <span className="font-bold">
                    {" "}
                    {selectedDocuments.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-bold">
                    {" "}
                    {MAX_SELECTED_DOCS}
                  </span>{" "}docs
                </div>
                <div className="ml-1 font-nunito ">
                  {isStartConversationButtonEnabled ? <>or</> : <>to</>}{" "}
                </div>
              </>
              <div className="md:ml-12">
                <button
                  disabled={!isStartConversationButtonEnabled}
                  onClick={handleSubmit}
                  className={cx(
                    "m-4 rounded border bg-llama-indigo px-6 py-2 font-nunito text-white hover:bg-[#3B3775] disabled:bg-gray-30 ",
                    !isStartConversationButtonEnabled &&
                      "border-gray-300 bg-gray-300"
                  )}
                >
                  <div className="flex items-center justify-center">
                    {isLoadingConversation ? (
                      <div className="flex h-[22px] w-[180px] items-center justify-center">
                        <LoadingSpinner />
                      </div>
                    ) : (
                      <>
                        start your conversation
                        <div className="ml-2">
                          <AiOutlineArrowRight />
                        </div>
                      </>
                    )}
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
