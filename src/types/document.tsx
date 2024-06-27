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
  language: string;
  color?: DocumentColorEnum;
  aws_s3_bucket_name?: string; 
  aws_s3_object_name?: string;
  aws_s3_file_name?: string;
}
