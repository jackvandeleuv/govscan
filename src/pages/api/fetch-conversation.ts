import { NextApiRequest, NextApiResponse } from 'next';
import { Document } from '~/types/document';
import type { Message } from "~/types/conversation";

type ResponseData = {
  messages?: Message[];
  documents?: Document[];
  message: string;
};

interface RequestBody {
  id: string;
  token: string;
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

  const documentUrl = `${process.env.SUPABASE_URL!}/rest/v1/document?select=id,language,url,geography,year,aws_s3_bucket_name,aws_s3_object_name,aws_s3_file_name,doc_type,conversationdocument!inner(conversation_id)&conversationdocument.conversation_id=eq.${id}`;
  const documentRequest = fetch(documentUrl, {
    method: 'GET',
    headers: headers
  });

  const messageUrl = `${process.env.SUPABASE_URL!}/rest/v1/message?select=id,content,role,updated_at,created_at&conversation_id=eq.${id}`;
  const messageRequest = fetch(messageUrl, {
    method: 'GET',
    headers: headers
  });


  const documentResponse = await documentRequest;
  if (!documentResponse.ok) {
    const error = await documentResponse.json();
    console.error('Error fetching document:', error);
    return;
  }
  const documents = await documentResponse.json();

  const messageResponse = await messageRequest;
  if (!messageResponse.ok) {
    const error = await messageResponse.json();
    console.error('Error fetching message:', error);
    return;
  }
  const messages = await messageResponse.json();

  res.status(200).json({ documents, messages, message: 'Success' });

}
