import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai'; 
import { v4 as uuidv4 } from "uuid";
import { MessageSubprocessSource, BackendCitation } from '~/types/conversation';
import { MESSAGE_STATUS, ROLE } from "~/types/conversation";

// This function can run for a maximum of 60 seconds
export const maxDuration = 60; 
export const dynamic = 'force-dynamic';

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

interface RequestBody {
  token: string;
}

type AnthropicAPIResponse = {
  content: Array<{
      text: string;
      type: string;
  }>;
  id: string;
  model: string;
  role: string;
  stop_reason: string | null;
  stop_sequence: null;  
  type: string;
  usage: {
      input_tokens: number;
      output_tokens: number;
  };
};


async function anthropicMessage(fullPrompt: string): Promise<string | null> {
  // const ANTHROPIC_CHAT_MODEL = "claude-3-haiku-20240307";
  const ANTHROPIC_CHAT_MODEL = "claude-3-5-sonnet-20240620";

  const chatUrl = 'https://api.anthropic.com/v1/messages';
  const chatHeaders = {
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
  };
  const chatBody = JSON.stringify({
      model: ANTHROPIC_CHAT_MODEL,
      max_tokens: 4096,
      messages: [
          {role: "user", content: fullPrompt}
      ]
  });

  try {
    const response = await fetch(chatUrl, {
      method: 'POST',
      headers: chatHeaders,
      body: chatBody
    });

    if (!response.ok) {
      console.error('HTTP Error:', response.status, await response.text());
      return null;
    }

    const chatResponse: AnthropicAPIResponse = await response.json() as AnthropicAPIResponse;
    return chatResponse.content[0]!.text;
  } catch (error) {
    console.error('Error in anthropicMessage:', error);
    return null;
  }
}


async function openAiMessage(fullPrompt: string): Promise<string | null> {
  const OPENAI_CHAT_MODEL = "gpt-4o";

  const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const completion = await openai.chat.completions.create({
      model: OPENAI_CHAT_MODEL,
      messages: [{ role: "user", content: fullPrompt }]
    });

    return completion.choices[0]!.message.content!;
  } catch (error) {
    console.error('Error in openAiMessage:', error);
    return null;
  }
}


async function getEmbedding(query: string): Promise<any> {
  const headers = {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY!}`,
    'Content-Type': 'application/json'
  };

  const data = JSON.stringify({
    input: query,
    model: 'text-embedding-3-small',
    encoding_format: 'float'
  });

  try {
    const embedResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: headers,
      body: data
    });

    if (!embedResponse.ok) {
      throw new Error(`HTTP error! status: ${embedResponse.status}`);
    }

    return embedResponse.json();
  } catch (error) {
    console.error('Error in getEmbedding:', error);
    throw error;
  }
}


function makeCitations(searchResults: SearchResult[]): BackendCitation[] {
  return searchResults.map(element => ({
    id: uuidv4(),
    document_id: element.document_id,
    page_number: element.page, 
    score: element.distance,
    text: element.text,
    message_id: element.message_id,
    data_id: element.data_id
  }));
}


function makeSubprocesses(searchResults: SearchResult[], message_id: string) {
  const docIdToName = new Map<string, string>();
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


export default async function handler(
  req: NextApiRequest, 
  res: NextApiResponse
) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
  res.status(401).json({ message: 'Authentication invalid.' });
    return;
  }

  const token = authHeader.replace('Bearer ', '');

  const { conversation_id, num_docs, message: userPrompt, user_message_id } = req.query as {
    conversation_id: string;
    num_docs: string;
    message: string;
    user_message_id: string;
  };

  if (!conversation_id || !userPrompt || !user_message_id || !num_docs) {
    res.status(400).json({ message: 'Missing body parameters.' });
    return;
  }

  if (isNaN(Number(num_docs))) {
    res.status(400).json({ message: 'num_docs is incorrectly formatted.' });
    return;
  }

  const queryVector = getEmbedding(userPrompt);

  const user_created_at = new Date().toISOString();
  const assistant_created_at = new Date(new Date(user_created_at).getTime() + 10).toISOString();
  const assistant_message_id = uuidv4();

  const messageUrl = `${process.env.SUPABASE_URL!}/rest/v1/message`;

  const headers: HeadersInit = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'apikey': process.env.SUPABASE_KEY!,
  };

  // POST user message
  await fetch(messageUrl, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({
      role: ROLE.USER, 
      content: userPrompt,
      conversation_id: conversation_id,
      created_at: user_created_at
    })
  });

  const searchUrl = `${process.env.SUPABASE_URL!}/rest/v1/rpc/semantic_search`;

  // Choose number of citations based on number of documents.
  const num_citations = Math.floor(11 - (Number.parseInt(num_docs) * 0.8));

  // Await user message embedding from API.
  const queryVectorResponse: EmbedResponse = await queryVector as EmbedResponse;
  const queryVectorData = queryVectorResponse.data[0];
  if (!queryVectorData) {
    res.status(400).json({ message: 'Embedding user query failed.' });
    return;
  }
  const userMessageEmbedding = queryVectorData.embedding;

  const searchBody = JSON.stringify({
    conv_id: conversation_id,
    num_chunks: num_citations,
    query_vector: JSON.stringify(userMessageEmbedding),
  });

  const searchResponse = await fetch(searchUrl, {
    method: 'POST',
    headers: headers,
    body: searchBody,
  });

  const searchResults = await searchResponse.json() as SearchResult[];

  const promptResults: PromptResult[] = searchResults.map(
    (sr): PromptResult => ({
      text: sr.text,
      page: sr.page,
      geography: sr.geography,
      year: sr.year,
      doc_type: sr.doc_type,
    })
  );

  const full_prompt = `Search Results: ${JSON.stringify(promptResults)}\n\nMessage: ${userPrompt}`;

  searchResults.forEach(element => {
    element.message_id = assistant_message_id;
  });
  
  const subProcesses = makeSubprocesses(searchResults, assistant_message_id);

  try {
    const assistantMessage = {
      id: assistant_message_id,
      content: await anthropicMessage(full_prompt) || '',
      role: ROLE.ASSISTANT,
      status: MESSAGE_STATUS.SUCCESS,
      conversationId: conversation_id,
      created_at: assistant_created_at,
      sub_processes: subProcesses
    };

    // POST assistant message.
    const assistantMessageRequest = await fetch(messageUrl, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        role: ROLE.ASSISTANT, 
        content: assistantMessage.content,
        conversation_id: conversation_id,
        created_at: assistant_created_at,
        id: assistant_message_id
      })
    });

    // POST citations
    const dataMessageUrl = `${process.env.SUPABASE_URL!}/rest/v1/datamessage`;
    const citationsData: Array<{ data_id: string; message_id: string; conversation_id: string; score: number }> = [];

    for (const subProcess of subProcesses) {
      const citations = subProcess.metadata_map.sub_question.citations;
      for (const citation of citations) {
        citationsData.push({
          data_id: citation.data_id,
          message_id: subProcess.messageId,
          conversation_id: conversation_id,
          score: citation.score
        });
      }
    }

    const dataMessageResponse = await fetch(dataMessageUrl, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(citationsData)
    });

    if (!dataMessageResponse.ok) {
      const errorText = await dataMessageResponse.text();
      console.error('Supabase Insert Error:', errorText);
      throw new Error(`HTTP error! status: ${dataMessageResponse.status}`);
    }

    if (!assistantMessageRequest.ok) {
      throw new Error(`HTTP error! status: ${dataMessageResponse.statusText}`);
    } 

    const userMessage = {
      id: user_message_id,
      content: userPrompt,
      role: ROLE.USER,
      status: MESSAGE_STATUS.SUCCESS,
      conversationId: conversation_id,
      created_at: user_created_at
    }

    res.status(200).json({ 
      message: 'Assistant message generated successfully.', 
      data: [userMessage, assistantMessage]
    });
    console.error("Completed api/chat successfully!");
    
  } catch (error) {
    console.error('Error in response stream:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
