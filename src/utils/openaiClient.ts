
import { toast } from "sonner";

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
  options: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  } = {}
): Promise<string> {
  if (!hasOpenAIKey()) {
    throw new Error("OpenAI API key not set");
  }

  const model = options.model || DEFAULT_MODEL;
  const maxTokens = options.maxTokens || 300;
  const temperature = options.temperature || 0.3;

  const prompt = `
You are a professional document summarizer. Create a concise, informative excerpt/summary 
for the following document titled "${fileName}". 
The summary should be 2-3 sentences long and highlight the key information.
Focus on the main topic, purpose, and any significant findings or conclusions.
Be clear, professional, and objective.

Here is the document content to summarize:
${content}
`;

  const messages: OpenAIMessage[] = [
    {
      role: "system",
      content: "You are a helpful assistant that specializes in document summarization.",
    },
    {
      role: "user",
      content: prompt,
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
