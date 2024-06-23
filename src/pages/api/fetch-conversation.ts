import { NextApiRequest, NextApiResponse } from 'next';
import { Document } from '~/types/document';
import type { Message, BackendCitation } from "~/types/conversation";
import { MessageSubprocessSource } from "~/types/conversation";

type ResponseData = {
  messages?: Message[];
  documents?: Document[];
  message: string;
};

interface RequestBody {
  id: string;
  token: string;
}


function makeSubprocesses(
  message: Message, 
  citationMap: Map<string, BackendCitation[]>,
  documents: Document[]
) {
  const message_id = message.id;

  if (!citationMap.has(message_id)) return;

  const citations = citationMap.get(message_id)!;

  const citationToDocument = new Map<string, BackendCitation[]>();
  for (const citation of citations) {
    const key = citation.document_id;
    if (citationToDocument.has(key)) {
      citationToDocument.get(key)!.push(citation);
    } else {
      citationToDocument.set(key, [citation]);
    }
  };

  const subProcesses = [];
  for (const [docId, citationArr] of citationToDocument.entries()) {
    const docName = documents.filter((d) => d.id === docId)[0]?.geography;
    subProcesses.push(
      {
        messageId: message_id,
        content: '',
        source: MessageSubprocessSource.PLACEHOLDER,
        metadata_map: {
          sub_question: {
            question: docName,
            citations: citationArr
          }
        }
      }
    )
  }

  return subProcesses;
};


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const requestBody = req.body as RequestBody;
  const id = requestBody.id;
  const token = requestBody.token;

  const headers = new Headers({
    'Content-Type': 'application/json',
    'apikey': process.env.SUPABASE_KEY!,
    'Authorization': `Bearer ${token}`
  });

  const messageUrl = `${process.env.SUPABASE_URL!}/rest/v1/message?select=id,content,role,updated_at,created_at&conversation_id=eq.${id}`;
  const messageRequest = fetch(messageUrl, {
    method: 'GET',
    headers: headers
  });

  const citationsUrl = `${process.env.SUPABASE_URL!}/rest/v1/rpc/citations`;
  const citationsBody = JSON.stringify({
    conv_id: id
  });
  const citationsRequest = fetch(citationsUrl, {
    method: 'POST',
    headers: headers,
    body: citationsBody,
  });

  const documentUrl = `${process.env.SUPABASE_URL!}/rest/v1/document?select=id,language,url,geography,year,aws_s3_bucket_name,aws_s3_object_name,aws_s3_file_name,doc_type,conversationdocument!inner(conversation_id)&conversationdocument.conversation_id=eq.${id}`;
  const documentRequest = fetch(documentUrl, {
    method: 'GET',
    headers: headers
  });
  
  const messageResponse = await messageRequest;
  if (!messageResponse.ok) {
    const error = await messageResponse.json();
    console.error('Error fetching message:', error);
    return;
  }
  const messages = await messageResponse.json();

  const citationResponse = await citationsRequest;
  if (!citationResponse.ok) {
    const error = await citationResponse.json();
    console.error('Error fetching citations:', error);
    return;
  }
  const citations = await citationResponse.json() as BackendCitation[];

  const documentResponse = await documentRequest;
  if (!documentResponse.ok) {
    const error = await documentResponse.json();
    console.error('Error fetching document:', error);
    return;
  }
  const documents = await documentResponse.json();

  // [   Citations
  //   {
  //     text: 'its inspection capacity to ensure that schools, including private ones, are equipped with the relevant basic facilities. SDG 5: Achieve gender equality and A63 Goal 18: Engaged and empowered youth and empower all women and girls children. Indicator 5.2.2: Proportion of women and girls aged 15 years and older subjected to sexual violence by persons other than an intimate partner in the previous 12 months, by age and place of occurrence Comprehensive data on proportion of women and girls aged 15 years and older subjected to sexual violence by persons other than an intimate partner in the previous 12 months',
  //     page_number: 30,
  //     document_id: '2a6efd8a-a789-4e75-a74f-2e28ca81d71f'
  //     message_id: '2a6efd8a-a789-4e75-a74f-2e28ca81d71f'
  //   },

  // export interface MessageSubProcess extends hasId {
  //   messageId: string;
  //   content: string;
  //   source: MessageSubprocessSource;
  //   metadata_map?: MetaDataMap;
  // }

  // export interface MetaDataMap {
  //   sub_question?: SubQuestion;
  //   sub_questions?: SubQuestion[];
  // }
  
  // export interface SubQuestion {
  //   question: string;
  //   answer?: string;
  //   citations?: BackendCitation[];
  // }
  
  // export interface BackendCitation {
  //   document_id: string;
  //   page_number: number;
  //   score: number;
  //   text: string;
  // }

  if (citations === null) {
    res.status(200).json({ documents, messages, message: 'Success' });
    return;
  };
  
  const citationMap = new Map<string, BackendCitation[]>();
  for (const citation of citations) {
    const key = citation.message_id;
    if (citationMap.has(key)) {
      citationMap.get(key)!.push(citation);
    } else {
      citationMap.set(key, [citation]);
    }
  };

  // select=id,content,role,updated_at,created_at

  // export interface Message extends hasId {
  //   content: string;
  //   role: ROLE;
  //   status: MESSAGE_STATUS;
  //   conversationId: string;
  //   sub_processes?: MessageSubProcess[];  // One per document
  //   created_at: Date;
  // }


  
  const updatedMessages: Message[] = [];
  for (const message of messages) {
    updatedMessages.push({
      ...message,
      sub_processes: makeSubprocesses(message, citationMap, documents)
    });
  };

  res.status(200).json({ documents, messages: updatedMessages, message: 'Success' });

}
