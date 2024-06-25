import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai'; 
import { v4 as uuidv4 } from "uuid";
import { MessageSubprocessSource, BackendCitation } from '~/types/conversation';
import { DocumentColorEnum } from "~/utils/colors";


const CHAT_MODEL = "gpt-4o";
// const CHAT_MODEL = "gpt-3.5-turbo";


interface SearchResult {
  text: string;
  dense_rank: number;
  distance: number;
  page: number;
  document_id: string;
  message_id: string;
  data_id: string;
  geography: string;
  year: string;
  doc_type: string;
}

interface PromptResult {
  text: string;
  page: number;
  geography: string;
  year: string;
  doc_type: string;
}

interface RequestBody {
  conversation_id: string;
  message: string;
  num_docs: number;
  token: string;
}

interface EmbedResponse {
  data: Array<{
    embedding: Array<number>; 
  }>;
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});


async function getEmbedding(query: string): Promise<number[]> {
  const headers = {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY!}`,
    'Content-Type': 'application/json'
  };

  const data = JSON.stringify({
    input: query,
    model: 'text-embedding-3-small',
    encoding_format: 'float'
  });

  const embedResponse = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: headers,
    body: data
  });

  if (!embedResponse.ok) {
    throw new Error(`HTTP error! status: ${embedResponse.status}`);
  }

  const responseJson: EmbedResponse = await embedResponse.json() as EmbedResponse;
  return responseJson.data[0]!.embedding;
}


function makeCitations(searchResults: SearchResult[]): BackendCitation[] {
  return searchResults.map(element => ({
    id: element.data_id,
    document_id: element.document_id,
    page_number: element.page, 
    score: element.distance,
    text: element.text,
    message_id: element.message_id
  }));
}


function makeSubprocesses(searchResults: SearchResult[], message_id: string) {
  // <document_id, name>
  const docIdToName = new Map<string, string>();

  // <document_id, SearchResult[]>
  const processMap = new Map<string, SearchResult[]>();

  for (const result of searchResults) {
    docIdToName.set(result.document_id, result.geography);
    if (processMap.has(result.document_id)) {
      const prevResult = processMap.get(result.document_id)!;
      processMap.set(result.document_id, [...prevResult, result]);
    } else {
      processMap.set(result.document_id, [result]);
    }
  }

  const subProcesses = [];
  for (const [docId, result] of processMap.entries()) {
    subProcesses.push({
      id: uuidv4(),
      messageId: message_id,
      content: '',
      source: MessageSubprocessSource.PLACEHOLDER, 
      metadata_map: {
        sub_question: {
          question: docIdToName.get(docId),
          citations: makeCitations(result)
        }
      }
    })
  }

  return subProcesses;
}


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const { conversation_id, message: userMessage, num_docs, token } = req.query as {
    conversation_id: string;
    message: string;
    num_docs: string;
    token: string;
  };

  if (!conversation_id || !userMessage || !token) {
    res.status(400).json({ message: 'Missing conversation_id / message / token' });
    return;
  }

  const messageUrl = `${process.env.SUPABASE_URL!}/rest/v1/message`;
  const user_created_at = new Date().toISOString();

  const headers: HeadersInit = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'apikey': process.env.SUPABASE_KEY!,
  };

  // POST user message
  void fetch(messageUrl, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      role: 'user', 
      content: userMessage,
      conversation_id: conversation_id,
      created_at: user_created_at
    })
  });

  const queryVector = getEmbedding(userMessage);

  const searchUrl = `${process.env.SUPABASE_URL!}/rest/v1/rpc/semantic_search`;

  if (typeof num_docs !== "string") {
    res.status(400).json({ message: 'num_docs is incorrectly formatted.' });
    return;
  }
  // Choose number of citations based on number of documents.
  const num_citations = Math.floor(11 - (Number.parseInt(num_docs) * 0.8));

  const body = JSON.stringify({
    conv_id: conversation_id,
    num_chunks: num_citations,
    query_vector: JSON.stringify(await queryVector),
  });

  const response = await fetch(searchUrl, {
    method: 'POST',
    headers: headers,
    body: body,
  });

  const searchResults = await response.json() as SearchResult[];

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const promptResults: PromptResult[] = searchResults.map((sr): PromptResult => ({
    text: sr.text,
    page: sr.page,
    geography: sr.geography,
    year: sr.year,
    doc_type: sr.doc_type,
  }));

  const full_prompt = `Search Results: ${JSON.stringify(promptResults)}\n\nMessage: ${userMessage}`;
  const assistant_message_id = uuidv4();

  searchResults.forEach(element => {
    element.message_id = assistant_message_id;
  });
  
  const subProcesses = makeSubprocesses(searchResults, assistant_message_id);

  const assistant_created_at = new Date().toISOString();
  const data = {
    id: assistant_message_id,
    content: '',
    role: "assistant",
    status: "PENDING",
    conversationId: conversation_id,
    created_at: assistant_created_at,
    sub_processes: subProcesses
  };

  try {
    const stream = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [{ role: "user", content: full_prompt }],
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

    // POST assistant message.
    await fetch(messageUrl, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        role: 'assistant', 
        content: data.content,
        conversation_id: conversation_id,
        created_at: assistant_created_at,
        id: assistant_message_id
      })
    });

    // POST citations
    const dataMessageUrl = `${process.env.SUPABASE_URL!}/rest/v1/datamessage`;
    for (const subProcess of subProcesses) {
      const citations = subProcess.metadata_map.sub_question.citations;
      for (const citation of citations) {
        void fetch(dataMessageUrl, {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            data_id: citation.id,
            message_id: subProcess.messageId,
            conversation_id: conversation_id,
            score: citation.score
          })
        });
      }
    }

  } catch (error) {
    console.error('Error in response stream:', error);
    data.status = 'ERROR';
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    res.status(500).json({ message: 'Internal Server Error' });
    res.end();
  }
}
