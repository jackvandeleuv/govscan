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
import { getToken } from "../supabase/manageTokens";
import { NextApiRequest, NextApiResponse } from 'next';


interface SupabaseDocument {
  doc_type: string;
  id: string;
  url: string;
  year: string;
  geography: string;
  language: string;
}


export const MAX_SELECTED_DOCS = 10;

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


  async function apiGetDocuments(): Promise<SupabaseDocument[] | undefined> {
    const token = await getToken();
    if (!token) {
      console.error('Could not get access token.')
      return;
    }

    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL!}/rest/v1/document?select=id,language,url,geography,year,doc_type`;

    const headers: HeadersInit = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    };

    try {
      const response = await fetch(url, { headers });

      if (!response.ok) {
        console.error(await response.text());
      }

      return await response.json() as SupabaseDocument[];

    } catch (error) {
      console.error(error);
    }
  }


  useEffect(() => {
    const getDocuments = async () => {
      const documents = await apiGetDocuments();
      if (!documents) {
        console.error("Could not fetch documents.")
        return;
      }

      const docs = documents.map((x: SupabaseDocument): Document => ({
        doc_type: x.doc_type,
        fullName: x.doc_type,
        id: x.id,
        url: x.url,
        year: `${x.year}, ${x.language}`,
        geography: x.geography,
        language: x.language
      }));

      setAvailableDocuments(docs);
    };

    void getDocuments().catch(error => console.error(error));
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
    const geos = getAllGeographies(availableDocuments, selectedDocumentType);
    if (geos) {
      setAvailableGeographies(geos);
    }
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

  const handleRemoveAll = () => {
    setSelectedDocuments([]);
  };

  const handleAddAll = () => {
    const updatedSelection = new Set([...selectedDocuments]);
     
    for (const doc of availableDocuments) {
      if (updatedSelection.size >= MAX_SELECTED_DOCS) break;
      updatedSelection.add(doc);
    }
    
    setSelectedDocuments([...updatedSelection]);
    setSelectedGeography(null);
    setSelectedDocumentType(null);
    setSelectedYear(null);
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
    selectedDocuments.length < MAX_SELECTED_DOCS;

  const isStartConversationButtonEnabled = selectedDocuments.length > 0;

  const selectGeography = (newGeography: SingleValue<SelectOption>, actionMeta: ActionMeta<SelectOption>) => {
    if (newGeography) {
      setSelectedGeography(newGeography);
      setFocusYear(true);
    }
  };
  

  const selectDocumentType = (docType: DocumentType | null) => {
    setSelectedDocumentType(docType);
    setFocusGeography(true);
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
    handleAddAll,
    handleRemoveAll
  };
};
