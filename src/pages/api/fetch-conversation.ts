import { NextApiRequest, NextApiResponse } from 'next';
import { Document } from '~/types/document';
import type { Message } from "~/types/conversation";

type ResponseData = {
  messages?: Message[];
  documents?: Document[];
  message: string;
};

interface RequestBody {
  conversationId: string;
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
  const conversationId = requestBody.conversationId;
  const token = requestBody.token;

  const url = `${process.env.SUPABASE_URL!}/rest/v1/rpc/fetch_conversation`;
  const headers = new Headers({
    'Content-Type': 'application/json',
    'apikey': process.env.SUPABASE_KEY!,
    'Authorization': `Bearer ${token}`
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({ conversationId })
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Error fetching conversation:', error);
    return;
  }

  const data = await response.json();
  console.log('Conversation data:', data);
}
