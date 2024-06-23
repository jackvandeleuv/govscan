import { backendUrl } from "~/config";
import type { Message } from "~/types/conversation";
import type { BackendDocument } from "~/types/backend/document";
import { Document } from "~/types/document";
import { fromBackendDocumentToFrontend } from "./utils/documents";

interface CreateConversationPayload {
  id: string;
}

interface GetConversationPayload {
  id: string;
  messages: Message[];
  documents: BackendDocument[];
}

export interface CitationChunks {
  company_name: string;
  company_ticker: string;
  doc_type: string;
  page_label: string;
  text: string;
  year: string;
}

interface GetConversationReturnType {
  messages: Message[];
  documents: Document[];
}

class BackendClient {
  private async get(endpoint: string) {
    let token = localStorage.getItem('authToken');
    if (token === null) {
      console.error('Invalid auth token.');
      token = '';
    }

    const url = backendUrl + endpoint;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      "Authorization": `Bearer ${token}`
    };

    const res = await fetch(url, {
      method: 'GET',
      headers: headers
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res;
  }

  private async post(endpoint: string, body?: any) {
    let token = localStorage.getItem('authToken');
    if (token === null) {
      console.error('Invalid auth token.');
      token = '';
    }

    const url = backendUrl + endpoint;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`, 
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res;
  }

  public async createConversation(documentIds: string[]): Promise<string> {
    const endpoint = "api/conversation/";
    const payload = { document_ids: documentIds };
    const res = await this.post(endpoint, payload);
    const data = (await res.json()) as CreateConversationPayload;

    return data.id;
  }

  public async fetchConversation(
    id: string
  ): Promise<GetConversationReturnType> {
    const endpoint = `api/conversation/${id}`;
    const res = await this.get(endpoint);
    const data = (await res.json()) as GetConversationPayload;

    return {
      messages: data.messages,
      documents: fromBackendDocumentToFrontend(data.documents),
    };
  }

  public async fetchChunks(
    conversation_id: string,
    userMessage: string
  ): Promise<CitationChunks[]> {

    const endpoint = `api/results/${conversation_id}?user_query=${userMessage}`;
    const res = await this.get(endpoint);
    const data = (await res.json()) as CitationChunks[];

    return data;
  }

  public async fetchDocuments(): Promise<Document[]> {
    const endpoint = `api/document/`;
    const res = await this.get(endpoint);
    const data = (await res.json()) as BackendDocument[];
    const docs = fromBackendDocumentToFrontend(data);
    return docs;
  }
}

export const backendClient = new BackendClient();
