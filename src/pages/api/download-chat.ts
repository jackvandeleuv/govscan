import { NextApiRequest, NextApiResponse } from 'next';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, ISectionOptions } from 'docx';

interface RequestBody {
    conversation_id: string;
}

interface PrintMessage {
    id: string;
    content: string;
    role: string;
    updated_at: string;
    created_at: string;
}

interface PrintCitation {
    text: string;
    page: number;
    year: number;
    doc_type: string;
    geography: string;
    source_url: string;
    language: string;
    created_at: string;
    score: number;
    message_id: string;
}


function formatMessagesCitations(messages: PrintMessage[], citations: PrintCitation[]): Document {
    const sections: ISectionOptions[] = messages
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .map(message => {
            const paragraphs = [
                new Paragraph({
                    text: capitalize(message.role) + ":",
                    heading: HeadingLevel.HEADING_1,
                    spacing: { after: 300 },
                }),
                new Paragraph({
                    text: message.content,
                    spacing: { after: 300 },
                }),
            ];

            if (message.role === 'assistant') {
                const associatedCitations = citations.filter(citation => citation.message_id === message.id);
                const groupedCitations = groupCitationsBySource(associatedCitations);

                paragraphs.push(new Paragraph({
                    text: "Citations:",
                    heading: HeadingLevel.HEADING_1,
                    spacing: { after: 300 },
                }));

                for (const [source, citations] of Object.entries(groupedCitations)) {
                    const firstCitation = citations[0];
                    paragraphs.push(new Paragraph({
                        text: `${firstCitation!.doc_type}, ${firstCitation!.geography} (${firstCitation!.year}):`,
                        heading: HeadingLevel.HEADING_3,
                        spacing: { after: 300 },
                    }));

                    citations.forEach(citation => {
                        paragraphs.push(new Paragraph({
                            children: [
                                new TextRun({
                                    text: `Page ${citation.page}: `,
                                    bold: true,
                                }),
                                new TextRun(citation.text),
                            ],
                            spacing: { after: 200 },
                        }));
                    });
                }
            }

            return { children: paragraphs };
    });

    const doc = new Document({
        sections: sections,
    });

    return doc;
}

function groupCitationsBySource(citations: PrintCitation[]): Record<string, PrintCitation[]> {
    return citations.reduce((acc, citation) => {
        const source = citation.source_url;
        if (!acc[source]) {
            acc[source] = [];
        }
        acc[source]!.push(citation);
        return acc;
    }, {} as Record<string, PrintCitation[]>);
}

function capitalize(word: string): string {
    return word.charAt(0).toUpperCase() + word.slice(1);
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

    const { conversation_id } = req.body as RequestBody;

    const headers = new Headers({
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_KEY!,
        'Authorization': `Bearer ${token}`
    });
    const messageUrl = `${process.env.SUPABASE_URL!}/rest/v1/message?select=id,content,role,updated_at,created_at&conversation_id=eq.${conversation_id}`;
    const messageRequest = fetch(messageUrl, {
      method: 'GET',
      headers: headers
    });

    const citationsUrl = `${process.env.SUPABASE_URL!}/rest/v1/rpc/export_citations`;
    const citationsBody = JSON.stringify({
      conv_id: conversation_id
    });
    const citationsRequest = fetch(citationsUrl, {
      method: 'POST',
      headers: headers,
      body: citationsBody,
    });

    const messageResponse = await messageRequest;
    const messages = await messageResponse.json() as PrintMessage[];

    const citationsResponse = await citationsRequest;
    const citations = await citationsResponse.json() as PrintCitation[];

    const doc = formatMessagesCitations(messages, citations);
    const buffer = await Packer.toBuffer(doc);
    const fileName = `chat_${conversation_id}.docx`;

    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.status(200).send(buffer);
}
