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

interface SupabaseDocument {
  doc_type: string;
  id: string;
  source_url: string;
  year: string;
  geography: string;
  aws_s3_bucket_name: string;
  aws_s3_object_name: string;
  aws_s3_file_name: string;
  language: string;
}

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

      const token = localStorage.getItem('authToken');

      const endpoint = '/api/document';
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });
      
      const response_json = await res.json();

      const docs = response_json.documents.map((x: SupabaseDocument): Document => ({
        docType: x.doc_type,
        fullName: x.doc_type,
        id: x.id,
        url: x.source_url,
        year: `${x.year}, ${x.language}`,
        geography: x.geography,
        aws_s3_bucket_name: x.aws_s3_bucket_name,
        aws_s3_object_name: x.aws_s3_object_name,
        aws_s3_file_name: x.aws_s3_file_name,
      }));

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      setAvailableDocuments(docs);
    }
    const token = localStorage.getItem('authToken');
    if (token === null) return;
    getDocuments();
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
