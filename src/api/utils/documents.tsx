import { MAX_SELECTED_DOCS } from "~/hooks/useDocumentSelector";
import { BackendDocument, BackendDocumentType } from "~/types/backend/document";
import { Document, DocumentType } from "~/types/document";
import { documentColors } from "~/utils/colors";
import _ from "lodash";

export const fromBackendDocumentToFrontend = (
  backendDocuments: BackendDocument[]
) => {
  // sort by created_at so that de-dupe filter later keeps oldest duplicate docs
  backendDocuments = _.sortBy(backendDocuments, 'created_at');
  let frontendDocs: Document[] = backendDocuments
  .filter((backendDoc) => 'sec_document' in backendDoc.metadata_map)
  .map((backendDoc, index) => {
    const backendDocType = backendDoc.metadata_map.sec_document.doc_type;
    const frontendDocType = backendDocType.toString();

    // we have 10 colors for 10 documents
    const colorIndex = index < 10 ? index : 0;

    // Currently, the sort docType is only stored in the backend in the url
    const urlParts = backendDoc.url.split('/');
    const shortDocType = urlParts[urlParts.length - 2];

    return {
      doc_type: shortDocType,
      fullName: backendDoc.metadata_map.sec_document.doc_type,
      id: backendDoc.id,
      url: backendDoc.url,
      year: backendDoc.metadata_map.sec_document.year,
      geography: backendDoc.metadata_map.sec_document.company_ticker
    } as Document;
  });
  // de-dupe hotfix
  const getDocDeDupeKey = (doc: Document) => `${doc.id}-${doc.year}-${doc.quarter || ''}`;
  frontendDocs = _.chain(frontendDocs).sortBy(getDocDeDupeKey).sortedUniqBy(getDocDeDupeKey).value();
  return frontendDocs;
};
