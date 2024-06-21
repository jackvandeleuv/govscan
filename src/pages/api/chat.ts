import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai'; 
import { v4 as uuidv4 } from "uuid";
import { MessageSubprocessSource } from '~/types/conversation';

const NUM_CHUNKS = 5;


interface SearchResult {
  text: string;
  dense_rank: number;
  score: number;
  page_number: number;
  document_id: string;
  message_id?: string;
}

interface Citation {
    document_id: string;
    page_number: number;
    score: number;
    text: string;
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});


async function getEmbedding(query: string): Promise<number[]> {
  const headers = {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json'
  };

  const data = JSON.stringify({
    input: query,
    model: 'text-embedding-3-small',
    encoding_format: 'float'
  });

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: headers,
    body: data
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const responseJson = await response.json();
  return responseJson.data[0].embedding;
}


function makeCitations(searchResults: SearchResult[]) {
  return searchResults.map(element => ({
    document_id: element.document_id,
    page_number: element.page_number,
    score: element.score,
    text: element.text
  }));
};


function makeSubprocesses(searchResults: SearchResult[], message_id: string) {
  const processMap = new Map<string, SearchResult[]>();
  for (const result of searchResults) {
    if (processMap.has(result.document_id)) {
      const prevResult = processMap.get(result.document_id)!;
      processMap.set(result.document_id, [...prevResult, result]);
    } else {
      processMap.set(result.document_id, [result]);
    }
  };

  const subProcesses = [];
  for (const [_, result] of processMap.entries()) {
    subProcesses.push({
      id: uuidv4(),
      messageId: message_id,
      content: '',
      source: MessageSubprocessSource.PLACEHOLDER, 
      metadata_map: {
        sub_question: {
          question: '',
          citations: makeCitations(result)
        }
      }
    })
  };

  return subProcesses;
};


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const { conversation_id, message, token } = req.query;

  if (!conversation_id || !message) {
    res.status(400).json({ message: 'Missing conversation_id / message / token' });
    return;
  }

  const queryVector = getEmbedding(message as string);

  const url = `${process.env.SUPABASE_URL!}/rest/v1/rpc/semantic_search`;
  const headers: HeadersInit = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'apikey': process.env.SUPABASE_KEY!,
  };

  const body = JSON.stringify({
    conv_id: conversation_id,
    num_chunks: NUM_CHUNKS,
    query_vector: JSON.stringify(await queryVector),
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: body,
  });

  const searchResults = await response.json() as SearchResult[];

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const full_prompt = `Search Results: ${JSON.stringify(searchResults)}\n\nMessage: ${message}`;
  const message_id = uuidv4();
  const created_at = Date.now();

  searchResults.forEach(element => {
    element.message_id = message_id;
  });
  
  const subProcesses = makeSubprocesses(searchResults, message_id);

  const data = {
    id: message_id,
    content: '',
    role: "assistant",
    status: "PENDING",
    conversationId: conversation_id,
    created_at: created_at,
    sub_processes: subProcesses
  };

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: full_prompt }],
      max_tokens: 1024,
      stream: true
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
          data.content = data.content + content;
          res.write(`data: ${JSON.stringify(data)}\n\n`);
      }
    }

    data.status = 'SUCCESS';
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    res.end();

  } catch (error) {
    console.error('Error in response stream:', error);
    data.status = 'ERROR';
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    res.status(500).json({ message: 'Internal Server Error' });
    res.end();
  }
}
