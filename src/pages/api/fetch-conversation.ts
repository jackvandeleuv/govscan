import { NextApiRequest, NextApiResponse } from 'next';
import { Document } from '~/types/document';
import type { Message, BackendCitation, MessageSubProcess } from "~/types/conversation";
import { MessageSubprocessSource } from "~/types/conversation";
import { v4 as uuidv4 } from "uuid";

type ResponseData = {
  messages?: Message[];
  documents?: Document[];
  message: string;
};

interface RequestBody {
  id: string;
  token: string;
}

type ErrorResponse = {
  message: string;
  [key: string]: any;
};


function makeSubprocesses(
  message: Message, 
  citationMap: Map<string, BackendCitation[]>,
  documents: Document[]
): MessageSubProcess[] | null {
  const message_id = message.id;

  if (!citationMap.has(message_id)) return null;

  const citations = citationMap.get(message_id)!;

  const citationToDocument = new Map<string, BackendCitation[]>();
  for (const citation of citations) {
    const key = citation.document_id;
    if (citationToDocument.has(key)) {
      citationToDocument.get(key)!.push(citation);
    } else {
      citationToDocument.set(key, [citation]);
    }
  }

  const subProcesses: MessageSubProcess[] = [];
  for (const [docId, citationArr] of citationToDocument.entries()) {
    const docName = documents.filter((d) => d.id === docId)[0]?.geography;
    subProcesses.push(
      {
        id: uuidv4(),
        messageId: message_id,
        content: '',
        source: MessageSubprocessSource.PLACEHOLDER,
        metadata_map: {
          sub_question: {
            question: docName!,
            citations: citationArr
          }
        }
      }
    )
  }

  return subProcesses;
}


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

  const documentUrl = `${process.env.SUPABASE_URL!}/rest/v1/document?select=id,language,url,geography,year,doc_type,conversationdocument!inner(conversation_id)&conversationdocument.conversation_id=eq.${id}`;
  const documentRequest = fetch(documentUrl, {
    method: 'GET',
    headers: headers
  });
  
  const messageResponse = await messageRequest;
  if (!messageResponse.ok) {
    const error: ErrorResponse = await messageResponse.json() as ErrorResponse;
    console.error('Error fetching message:', error);
    return;
  }
  const messages: Message[] = await messageResponse.json() as Message[];

  const citationResponse = await citationsRequest;
  if (!citationResponse.ok) {
    const error: ErrorResponse = await citationResponse.json() as ErrorResponse;
    console.error('Error fetching citations:', error);
    return;
  }
  const citations: BackendCitation[] = await citationResponse.json() as BackendCitation[];

  const documentResponse = await documentRequest;
  if (!documentResponse.ok) {
    const error: ErrorResponse = await documentResponse.json() as ErrorResponse;
    console.error('Error fetching document:', error);
    return;
  }
  const documents: Document[] = await documentResponse.json() as Document[];

  if (citations === null) {
    console.log('No citations!')
    res.status(200).json({ documents, messages, message: 'Success' });
    return;
  }
  
  const citationMap = new Map<string, BackendCitation[]>();
  for (const citation of citations) {
    const key = citation.message_id;
    if (citationMap.has(key)) {
      citationMap.get(key)!.push(citation);
    } else {
      citationMap.set(key, [citation]);
    }
  }
  
  const updatedMessages: Message[] = [];
  for (const message of messages) {
    console.log('Processing message:')
    console.log(message)
    const subProcesses = makeSubprocesses(message, citationMap, documents) || undefined;
    updatedMessages.push({
      ...message,
      sub_processes: subProcesses
    });
  }

  res.status(200).json({ documents, messages: updatedMessages, message: 'Success' });

}
