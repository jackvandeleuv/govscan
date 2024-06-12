import { useState, useEffect, useRef } from "react";
import { ActionMeta, GroupBase, SingleValue } from "react-select";
import Select from "react-select/dist/declarations/src/Select";
import { Document, DocumentType, Geography } from "~/types/document";
import type { SelectOption } from "~/types/selection";
import {
  findDocumentById,
  getAllDocumentTypes,
  getAllGeographies,
  sortDocuments,
  sortSelectOptions,
} from "~/utils/documents";
import {
  getAvailableYears,
} from "~/utils/landing-page-selection";
import useLocalStorage from "./utils/useLocalStorage";
import { backendClient } from "~/api/backend";

export const MAX_NUMBER_OF_SELECTED_DOCUMENTS = 20;

export const useDocumentSelector = () => {
  const [availableDocuments, setAvailableDocuments] = useState<Document[]>(
    []
  );
  const [availableGeographies, setAvailableGeographies] = useState<Geography[]>([]);
  const [availableDocumentTypes, setAvailableDocumentTypes] = useState<DocumentType[]>([]);
  const [availableYears, setAvailableYears] = useState<SelectOption[] | null>(
    null
  );

  const sortedAvailableYears = sortSelectOptions(availableYears);

  useEffect(() => {
    setAvailableDocumentTypes(getAllDocumentTypes(availableDocuments));
  }, [availableDocuments]);

  useEffect(() => {
    async function getDocuments() {
      const docs = await backendClient.fetchDocuments();
      setAvailableDocuments(docs);
    }
    const token = localStorage.getItem('authToken');
    if (token === null) return;
    getDocuments().catch(() => console.error("could not fetch documents"));
  }, []);

  const [selectedDocuments, setSelectedDocuments] = useLocalStorage<
    Document[]
  >("selectedDocuments", []);
  const sortedSelectedDocuments = sortDocuments(selectedDocuments);

  const [selectedGeography, setSelectedGeography] = useState<SelectOption | null>(null);
  const [selectedDocumentType, setSelectedDocumentType] =
    useState<DocumentType | null>(null);
  const [selectedYear, setSelectedYear] = useState<SelectOption | null>(null);

  useEffect(() => {
    setAvailableGeographies(getAllGeographies(availableDocuments, selectedDocumentType));
  }, [availableDocuments, selectedDocumentType]);

  const handleAddDocument = () => {
    if (selectedGeography && selectedDocumentType && selectedYear) {
      setSelectedDocuments((prevDocs = []) => {
        if (prevDocs.find((doc) => doc.id === selectedYear.value)) {
          return prevDocs;
        }
        const newDoc = findDocumentById(selectedYear.value, availableDocuments);
        return newDoc ? [newDoc, ...prevDocs] : prevDocs;
      });
      setSelectedGeography(null);
      setSelectedDocumentType(null);
      setSelectedYear(null);
      setShouldFocusCompanySelect(true);
    }
  };

  const handleRemoveDocument = (documentIndex: number) => {
    setSelectedDocuments((prevDocs) =>
      prevDocs.filter((_, index) => index !== documentIndex)
    );
  };

  useEffect(() => {
    setSelectedYear(null);
  }, [selectedGeography]);

  useEffect(() => {
    setSelectedGeography(null);
  }, [selectedDocumentType]);

  useEffect(() => {
    if (selectedGeography && selectedDocumentType) {
      setAvailableYears(
        getAvailableYears(
          selectedGeography?.label,
          selectedDocumentType,
          availableDocuments
        )
      );  
    } 
  }, [selectedGeography, selectedDocumentType, availableDocuments]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        (event.key === "Enter" && event.shiftKey) ||
        (event.key === "Enter" && event.metaKey)
      ) {
        handleAddDocument();
      }
      if (event.key === "k" && event.metaKey) {
        setShouldFocusCompanySelect(true);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleAddDocument]);

  const isDocumentSelectionEnabled =
    selectedDocuments.length < MAX_NUMBER_OF_SELECTED_DOCUMENTS;

  const isStartConversationButtonEnabled = selectedDocuments.length > 0;

  const selectGeography = (newGeography: SingleValue<SelectOption>, actionMeta: ActionMeta<SelectOption>) => {
    if (newGeography) {
      setSelectedGeography(newGeography);
      setFocusYear(true);
    }
  };
  

  const selectDocumentType = (docType: DocumentType | null) => {
    setSelectedDocumentType(docType);
    setFocusGeography(true)
  };

  const [shouldFocusCompanySelect, setShouldFocusCompanySelect] =
    useState(false);

  const [focusYear, setFocusYear] = useState(false);
  const yearFocusRef = useRef<Select<
    SelectOption,
    false,
    GroupBase<SelectOption>
  > | null>(null);

  useEffect(() => {
    if (focusYear && yearFocusRef.current) {
      yearFocusRef.current?.focus();
      setFocusYear(false);
    }
  }, [focusYear]);

  const [focusGeography, setFocusGeography] = useState(false);
  const geographyFocusRef = useRef<Select<
    SelectOption,
    false,
    GroupBase<SelectOption>
  > | null>(null);

  useEffect(() => {
    if (focusGeography && geographyFocusRef.current) {
      geographyFocusRef.current?.focus();
      setFocusGeography(false);
    }
  }, [focusGeography]);

  return {
    availableDocuments,
    availableGeographies,
    availableDocumentTypes,
    availableYears,
    sortedAvailableYears,
    selectedDocuments,
    sortedSelectedDocuments,
    selectedGeography,
    selectedDocumentType,
    selectedYear,
    setSelectedYear,
    handleAddDocument,
    handleRemoveDocument,
    isDocumentSelectionEnabled,
    isStartConversationButtonEnabled,
    yearFocusRef,
    documentTypeFocusRef: geographyFocusRef,
    selectGeography,
    selectDocumentType,
    shouldFocusCompanySelect,
    setShouldFocusCompanySelect,
  };
};
