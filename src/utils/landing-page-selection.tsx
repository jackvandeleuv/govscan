import { DocumentType } from "~/types/document";
import type { Document } from "~/types/document";

import type { SelectOption } from "~/types/selection";
import { filterByGeographyAndType as filterByGeographyAndType } from "./documents";


function documentToYearOption(document: Document): SelectOption {
  if (document.quarter) {
    return {
      value: document.id,
      label: document.year
    };
  }
  return {
    value: document.id,
    label: document.year,
  };
}

export function getAvailableYears(
  geography: string,
  type: DocumentType,
  documents: Document[]
): SelectOption[] {
  const docType = type.doc_type;
  const docs = filterByGeographyAndType(geography, docType, documents);
  const yearOptions: SelectOption[] = docs.map(documentToYearOption);
  return yearOptions;
}
