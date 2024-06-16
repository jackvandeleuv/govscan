import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

type ResponseData = {
  message: string;
  newConversationId?: string;
};

interface RequestBody {
  documentIds: string[];
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

  const body = req.body as RequestBody;

  const conversationId = uuidv4();

  const conversationUrl = `${process.env.SUPABASE_URL!}/rest/v1/conversation`;
  const conversationDocumentUrl = `${process.env.SUPABASE_URL!}/rest/v1/conversationdocument`;

  const headers: HeadersInit = {
    'Authorization': `Bearer ${body.token}`,
    'Content-Type': 'application/json',
    'apikey': process.env.SUPABASE_KEY!,
  };

  try {
    const conversationResponse = await fetch(conversationUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ id: conversationId }),
    });

    if (!conversationResponse.ok) {
      throw new Error(`HTTP error! status: ${conversationResponse.status}`);
    }

    for (const docId of body.documentIds) {
      const conversationDocumentResponse = await fetch(conversationDocumentUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ conversation_id: conversationId, document_id: docId }),
      });

      const conversationDocumentData = await conversationDocumentResponse.text();

      if (!conversationDocumentResponse.ok) {
        throw new Error(`HTTP error! status: ${conversationDocumentResponse.status}`);
      }
    }

    res.status(200).json({
      message: 'Conversation created successfully',
      newConversationId: conversationId,
    });

  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
  }
}
