import { toast } from "sonner";
import { AiProcessingOptions } from "@/types/document";
import { CategoryNode } from "@/types/categories";
import { AppendixItem } from "@/types/circular-letter";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

// Default model to use for summarization
const DEFAULT_MODEL = "gpt-4o-mini";

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenAIRequestBody {
  model: string;
  messages: OpenAIMessage[];
  max_tokens?: number;
  temperature?: number;
}

interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

let apiKey: string | null = localStorage.getItem("openai_api_key");

/**
 * Set the OpenAI API key to use for requests
 */
export function setOpenAIKey(key: string): void {
  apiKey = key;
  localStorage.setItem("openai_api_key", key);
}

/**
 * Get the stored OpenAI API key
 */
export function getOpenAIKey(): string | null {
  return apiKey;
}

/**
 * Clear the stored OpenAI API key
 */
export function clearOpenAIKey(): void {
  apiKey = null;
  localStorage.removeItem("openai_api_key");
}

/**
 * Check if an OpenAI API key is available
 */
export function hasOpenAIKey(): boolean {
  return apiKey !== null && apiKey.trim() !== "";
}

/**
 * Send a request to the OpenAI API for document summarization
 */
export async function summarizeWithOpenAI(
  content: string,
  fileName: string,
  options: AiProcessingOptions = {}
): Promise<string> {
  if (!hasOpenAIKey()) {
    throw new Error("OpenAI API key not set");
  }

  const model = options.model || DEFAULT_MODEL;
  const maxTokens = options.maxTokens || 300;
  const temperature = options.temperature || 0.3;

  const systemPrompt = `You are tasked with creating concise document summaries. Your summaries should be professional, factual, and never contain meta-text about AI or instructions.`;
  
  const userPrompt = `Create a brief, professional summary of this document titled "${fileName}". The summary should be 2-3 sentences that capture the main topic and key points. Write in clear, straightforward language that would appear in a document management system. Do not include any meta-commentary about AI or summarization processes in your response.

Here is the document content:
${content}`;

  const messages: OpenAIMessage[] = [
    {
      role: "system",
      content: systemPrompt,
    },
    {
      role: "user",
      content: userPrompt,
    },
  ];

  const requestBody: OpenAIRequestBody = {
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
  };

  try {
    console.log(`Sending OpenAI request for document: ${fileName}`);
    
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API error:", errorData);
      throw new Error(
        `OpenAI API error: ${errorData.error?.message || response.statusText}`
      );
    }

    const data = await response.json() as OpenAIResponse;
    console.log(`Received OpenAI response for document: ${fileName}`, {
      model: data.model,
      usage: data.usage,
    });
    
    const summary = data.choices[0]?.message.content.trim();

    if (!summary) {
      throw new Error("OpenAI returned an empty summary");
    }

    return summary;
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    throw error;
  }
}

/**
 * Determine the most appropriate category for a document based on its content
 */
export async function categorizeWithOpenAI(
  content: string,
  fileName: string,
  categories: CategoryNode[],
  options: AiProcessingOptions = {}
): Promise<string> {
  if (!hasOpenAIKey()) {
    throw new Error("OpenAI API key not set");
  }

  if (!categories || categories.length === 0) {
    throw new Error("No categories provided for categorization");
  }

  // Format category hierarchy into a readable format for the AI
  const formatCategories = (nodes: CategoryNode[], indent = 0): string => {
    return nodes.map(cat => {
      const prefix = ' '.repeat(indent);
      const children = cat.children.length > 0 
        ? `\n${formatCategories(cat.children, indent + 2)}` 
        : '';
      return `${prefix}- ${cat.name}${children}`;
    }).join('\n');
  };

  const categoryHierarchy = formatCategories(categories);
  
  const model = options.model || DEFAULT_MODEL;
  const maxTokens = options.maxTokens || 300;
  const temperature = options.temperature || 0.3;

  const systemPrompt = `You are a document categorization assistant. Your task is to analyze document content and assign it to the most appropriate category from a predefined hierarchy.`;
  
  const userPrompt = `Analyze this document titled "${fileName}" and determine the most appropriate category from the following hierarchy. 
  
Return the full category path using " > " as a separator (e.g., "Main Category > Subcategory"). If the document doesn't fit any category well, choose the closest match. Only return the category path, nothing else.

Available categories:
${categoryHierarchy}

Document content:
${content.substring(0, 8000)} // Limit content to avoid token limits
`;

  const messages: OpenAIMessage[] = [
    {
      role: "system",
      content: systemPrompt,
    },
    {
      role: "user",
      content: userPrompt,
    },
  ];

  const requestBody: OpenAIRequestBody = {
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
  };

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API error:", errorData);
      throw new Error(
        `OpenAI API error: ${errorData.error?.message || response.statusText}`
      );
    }

    const data = await response.json() as OpenAIResponse;
    const categoryPath = data.choices[0]?.message.content.trim();

    if (!categoryPath) {
      throw new Error("OpenAI returned an empty category");
    }

    return categoryPath;
  } catch (error) {
    console.error("Error calling OpenAI API for categorization:", error);
    throw error;
  }
}

/**
 * Generate 1-5 relevant tags for a document based on its content
 */
export async function generateTagsWithOpenAI(
  content: string,
  fileName: string,
  options: AiProcessingOptions = {}
): Promise<string> {
  if (!hasOpenAIKey()) {
    throw new Error("OpenAI API key not set");
  }
  
  const model = options.model || DEFAULT_MODEL;
  const maxTokens = options.maxTokens || 100;
  const temperature = options.temperature || 0.3;

  const systemPrompt = `You are an expert document tagger. Your task is to analyze documents and generate 1-5 relevant, concise tags that accurately reflect the document's content and themes.`;
  
  const userPrompt = `Analyze this document titled "${fileName}" and generate 1-5 relevant tags. 
  
Return the tags as a comma-separated list (e.g., "compliance, regulations, safety"). Choose tags that accurately represent the main themes and topics of the document. Tags should be single words or short phrases, all lowercase.

Document content:
${content.substring(0, 8000)} // Limit content to avoid token limits
`;

  const messages: OpenAIMessage[] = [
    {
      role: "system",
      content: systemPrompt,
    },
    {
      role: "user",
      content: userPrompt,
    },
  ];

  const requestBody: OpenAIRequestBody = {
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
  };

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API error:", errorData);
      throw new Error(
        `OpenAI API error: ${errorData.error?.message || response.statusText}`
      );
    }

    const data = await response.json() as OpenAIResponse;
    console.log(`Received OpenAI tags response for document: ${fileName}`, {
      model: data.model,
      usage: data.usage,
    });
    
    const tags = data.choices[0]?.message.content.trim();

    if (!tags) {
      throw new Error("OpenAI returned empty tags");
    }

    return tags;
  } catch (error) {
    console.error("Error calling OpenAI API for tag generation:", error);
    throw error;
  }
}

/**
 * Extract specific data from circular letters using OpenAI
 */
export async function extractCircularLetterDataWithOpenAI(
  content: string,
  fileName: string,
  options: AiProcessingOptions = {}
): Promise<{
  referenceNumber: string;
  correspondenceRef: string;
  date: string;
  audience: string;
  title: string;
  details: string;
  author: string;
  tags: string;
  appendices: AppendixItem[];
}> {
  if (!hasOpenAIKey()) {
    throw new Error("OpenAI API key not set");
  }

  const model = options.model || DEFAULT_MODEL;
  const maxTokens = options.maxTokens || 2000;
  const temperature = options.temperature || 0.3;

  const systemPrompt = `You are a data extraction specialist that analyzes circular letters and extracts specific information from them. Your task is to extract the following information from the document:
1. Reference Number: The document's unique identifier or reference code
2. Correspondence Reference: Any internal reference numbers mentioned in the body of the document (different from the main reference number)
3. Date: The date when the circular letter was issued, in YYYY-MM-DD format
4. Audience: The intended recipients or departments that should read this circular
5. Title: The main title or subject of the circular letter
6. Details: The full content of the circular letter, excluding headers, footers, salutations, and signatures. This should be the complete text of the main body of the document.
7. Author/Sender: The person, department, or authority who issued the circular letter
8. Tags: Generate 1-5 relevant keywords or tags that describe the main topics of this circular letter, separated by commas
9. Appendices: If the document contains appendices, identify each one as a separate item with a title and content.

Format your response as a JSON object with these fields. If you cannot find a specific field, use an empty string as value. For appendices, return an array of objects, each with 'title' and 'content' fields. If there are no appendices, use an empty array.`;
  
  const userPrompt = `Extract information from this circular letter with filename "${fileName}".

Here is the document content:
${content}

Return a JSON object with the fields: referenceNumber, correspondenceRef, date, audience, title, details, author, tags, and appendices.`;

  const messages: OpenAIMessage[] = [
    {
      role: "system",
      content: systemPrompt,
    },
    {
      role: "user",
      content: userPrompt,
    },
  ];

  const requestBody: OpenAIRequestBody = {
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
  };

  try {
    console.log(`Sending OpenAI request for circular letter: ${fileName}`);
    
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API error:", errorData);
      throw new Error(
        `OpenAI API error: ${errorData.error?.message || response.statusText}`
      );
    }

    const data = await response.json() as OpenAIResponse;
    console.log(`Received OpenAI response for circular letter: ${fileName}`, {
      model: data.model,
      usage: data.usage,
    });
    
    const resultText = data.choices[0]?.message.content.trim();

    if (!resultText) {
      throw new Error("OpenAI returned an empty response");
    }

    try {
      // Parse the JSON response
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : resultText;
      const extractedData = JSON.parse(jsonStr);
      
      return {
        referenceNumber: extractedData.referenceNumber || '',
        correspondenceRef: extractedData.correspondenceRef || '',
        date: extractedData.date || '',
        audience: extractedData.audience || '',
        title: extractedData.title || '',
        details: extractedData.details || '',
        author: extractedData.author || '',
        tags: extractedData.tags || '',
        appendices: Array.isArray(extractedData.appendices) ? extractedData.appendices : []
      };
    } catch (error) {
      console.error("Error parsing OpenAI response:", error);
      // Fallback to empty values if parsing fails
      return {
        referenceNumber: '',
        correspondenceRef: '',
        date: '',
        audience: '',
        title: '',
        details: '',
        author: '',
        tags: '',
        appendices: []
      };
    }
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    throw error;
  }
}
