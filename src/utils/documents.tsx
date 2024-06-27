import type { Document, Geography, DocumentType } from "~/types/document";
import { SelectOption } from "~/types/selection";

export function getAllGeographies(
  documents: Document[], 
  selectedDocumentType: DocumentType | null
): Geography[] | null {
  if (selectedDocumentType === null) {
    return null
  }

  const result: Geography[] = [];

  for (const doc of documents) {
    // Skip if we've seen this ticker before
    if (doc.docType !== selectedDocumentType.docType) {
      continue;
    }

    result.push({
      name: doc.geography,
    });
  }

  return result;
}

export function getAllDocumentTypes(documents: Document[]): DocumentType[] {
  const result: DocumentType[] = [];
  const seen: { [key: string]: boolean } = {};

  for (const doc of documents) {
    // Skip if we've seen this ticker before
    if (seen[doc.docType]) {
      continue;
    }

    seen[doc.docType] = true;
    result.push({
      docType: doc.docType,
      fullName: doc.fullName
    });
  }

  return result;
}

export function filterByGeographyAndType(
  geography: string,
  docType: string,
  documents: Document[]
): Document[] {
  if (!geography) {
    return [];
  }
  return documents.filter(
    (document) => document.geography === geography && document.docType === docType
  );
}

export function findDocumentById(
  id: string,
  documents: Document[]
): Document | null {
  return documents.find((val) => val.id === id) || null;
}

export function sortDocuments(selectedDocuments: Document[]): Document[] {
  return selectedDocuments;
  
  // TODO: Check sort function works.
  // return selectedDocuments.sort((a, b) => {
  //   // Sort by fullName
  //   const nameComparison = a.fullName.localeCompare(b.fullName);
  //   if (nameComparison !== 0) return nameComparison;

  //   // If fullNames are equal, sort by year
  //   return a.year.localeCompare(b.year);
  // });
}

export function sortSelectOptions(
  options: SelectOption[] | null = []
): SelectOption[] {
  if (!options) {
    return [];
  }

  return options.sort((a, b) => parseInt(a.label) - parseInt(b.label));
}
