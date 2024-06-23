// pages/api/document.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { Document } from '~/types/document';

type ResponseData = {
  message: string;
  documents?: Document[];
};

interface ResponseBody {
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
  const body = req.body as ResponseBody;
  const token = body.token;

  if (!token) {
    res.status(400).json({ message: 'Token is required' });
    return;
  }

  const url = `${process.env.SUPABASE_URL!}/rest/v1/document?select=id,language,url,geography,year,doc_type`;

  const headers: HeadersInit = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'apikey': process.env.SUPABASE_KEY!,
  };

  try {
    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const documents = await response.json() as Document[];

    res.status(200).json({ message: 'Documents retrieved successfully', documents });

  } catch (error) {
    console.error(error)
    console.error('Error fetching documents:', error);
    res.status(500).json({ message: error as string });
  }
}
