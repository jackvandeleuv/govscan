import { DocumentColorEnum } from "~/utils/colors";


export type DocumentType = {
  docType: string;
  fullName: string;
}

export type Geography = {
  name: string;
};

export interface Document extends DocumentType {
  id: string;
  url: string;
  year: string;
  geography: string;
  quarter?: string;
  color?: DocumentColorEnum;
}
