import { toast } from "sonner";
import { AiProcessingOptions } from "@/types/document";
import { CategoryNode } from "@/types/categories";
import { AppendixItem } from "@/types/circular-letter";
import { getPromptConfig } from "@/utils/promptManager";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

// Default model to use for summarization
const DEFAULT_MODEL = "gpt-4o-mini";

// Rate limiting configuration
const MAX_RETRIES = 3;
const BASE_DELAY = 1000; // 1 second base delay

// Sleep function for delays
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Rate limit tracking
let requestQueue: Promise<any>[] = [];
const MAX_CONCURRENT_REQUESTS = 3;

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
 * Rate-limited OpenAI API call with retry logic
 */
async function makeOpenAIRequest(requestBody: OpenAIRequestBody, context: string): Promise<OpenAIResponse> {
  if (!hasOpenAIKey()) {
    throw new Error("OpenAI API key not set");
  }

  // Wait for available slot in request queue
  while (requestQueue.length >= MAX_CONCURRENT_REQUESTS) {
    await Promise.race(requestQueue);
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      console.log(`Making OpenAI request for ${context} (attempt ${attempt + 1}/${MAX_RETRIES})`);
      
      const requestPromise = fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      // Add to queue
      requestQueue.push(requestPromise);
      
      // Clean up completed requests
      requestPromise.finally(() => {
        requestQueue = requestQueue.filter(req => req !== requestPromise);
      });

      const response = await requestPromise;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
        
        // Check if it's a rate limit error
        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after');
          const delayMs = retryAfter ? parseInt(retryAfter) * 1000 : BASE_DELAY * Math.pow(2, attempt);
          
          console.warn(`Rate limit hit for ${context}, retrying in ${delayMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
          
          if (attempt === MAX_RETRIES - 1) {
            toast.error("OpenAI rate limit exceeded. Please try again later.");
            throw new Error(`Rate limit exceeded: ${errorData.error?.message || 'Too many requests'}`);
          }
          
          await sleep(delayMs);
          continue;
        }
        
        // For non-rate-limit errors, throw immediately
        console.error("OpenAI API error:", errorData);
        throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json() as OpenAIResponse;
      console.log(`Received OpenAI response for ${context}`, {
        model: data.model,
        usage: data.usage,
      });
      
      return data;
    } catch (error) {
      lastError = error as Error;
      
      // If it's not a rate limit error, don't retry
      if (!error.message.includes('Rate limit') && !error.message.includes('429')) {
        throw error;
      }
      
      // Wait before retry for rate limit errors
      if (attempt < MAX_RETRIES - 1) {
        const delayMs = BASE_DELAY * Math.pow(2, attempt);
        console.warn(`Request failed for ${context}, retrying in ${delayMs}ms`);
        await sleep(delayMs);
      }
    }
  }

  // If we exhausted all retries
  throw lastError || new Error(`Failed to complete OpenAI request for ${context} after ${MAX_RETRIES} attempts`);
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

  const config = getPromptConfig('summarization');
  const model = options.model || config.model;
  const maxTokens = options.maxTokens || config.maxTokens;
  const temperature = options.temperature || config.temperature;

  const systemPrompt = config.systemPrompt;
  
  const userPrompt = config.userPromptTemplate
    .replace('{fileName}', fileName)
    .replace('{content}', content.substring(0, 400000)); // Safety truncation

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
    const data = await makeOpenAIRequest(requestBody, `document summarization: ${fileName}`);
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
  
  console.log("Formatted category hierarchy being sent to AI:");
  console.log(categoryHierarchy);
  
  const config = getPromptConfig('categorization');
  const model = options.model || config.model;
  const maxTokens = options.maxTokens || config.maxTokens;
  const temperature = options.temperature || config.temperature;

  const systemPrompt = config.systemPrompt;
  
  const userPrompt = config.userPromptTemplate
    .replace('{fileName}', fileName)
    .replace('{categories}', categoryHierarchy)
    .replace('{content}', content.substring(0, 8000));

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
    const data = await makeOpenAIRequest(requestBody, `categorization: ${fileName}`);
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
 * Categorize standards documents as either "Standards > System" or "Standards > Service"
 */
export async function categorizeStandardsWithOpenAI(
  content: string,
  fileName: string,
  options: AiProcessingOptions = {}
): Promise<string> {
  if (!hasOpenAIKey()) {
    throw new Error("OpenAI API key not set");
  }

  const config = getPromptConfig('standardsCategorization');
  const model = options.model || config.model;
  const maxTokens = options.maxTokens || config.maxTokens;
  const temperature = options.temperature || config.temperature;

  const systemPrompt = config.systemPrompt;
  
  const userPrompt = config.userPromptTemplate
    .replace('{fileName}', fileName)
    .replace('{content}', content.substring(0, 8000));

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
    const data = await makeOpenAIRequest(requestBody, `standards categorization: ${fileName}`);
    const categoryPath = data.choices[0]?.message.content.trim();

    if (!categoryPath) {
      throw new Error("OpenAI returned an empty category");
    }

    // Validate that the returned category is one of the expected values
    const validCategories = ["Standards > System", "Standards > Service"];
    if (!validCategories.includes(categoryPath)) {
      console.warn(`Invalid category returned: ${categoryPath}, defaulting to Standards > System`);
      return "Standards > System";
    }

    return categoryPath;
  } catch (error) {
    console.error("Error calling OpenAI API for standards categorization:", error);
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
  
  const config = getPromptConfig('tagGeneration');
  const model = options.model || config.model;
  const maxTokens = options.maxTokens || config.maxTokens;
  const temperature = options.temperature || config.temperature;

  const systemPrompt = config.systemPrompt;
  
  const userPrompt = config.userPromptTemplate
    .replace('{fileName}', fileName)
    .replace('{content}', content.substring(0, 8000));

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
    const data = await makeOpenAIRequest(requestBody, `tag generation: ${fileName}`);
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
  excerpt: string;
  author: string;
  tags: string;
  appendices: AppendixItem[];
}> {
  if (!hasOpenAIKey()) {
    throw new Error("OpenAI API key not set");
  }

  const config = getPromptConfig('circularLetters');
  const model = options?.model || config.model;
  const maxTokens = options?.maxTokens || config.maxTokens;
  const temperature = options?.temperature || config.temperature;

  const systemPrompt = config.systemPrompt;
  
  const userPrompt = config.userPromptTemplate
    .replace('{fileName}', fileName)
    .replace('{content}', content);

  console.log('Circular letter prompt config:', {
    systemPrompt: systemPrompt.substring(0, 200) + '...',
    userPrompt: userPrompt.substring(0, 200) + '...',
    model,
    includesExcerpt: systemPrompt.includes('Excerpt')
  });

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
    const data = await makeOpenAIRequest(requestBody, `circular letter extraction: ${fileName}`);
    const resultText = data.choices[0]?.message.content.trim();

    if (!resultText) {
      throw new Error("OpenAI returned an empty response");
    }

    try {
      // Parse the JSON response
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : resultText;
      const extractedData = JSON.parse(jsonStr);
      
      console.log('OpenAI extracted data:', {
        hasExcerpt: !!extractedData.excerpt,
        excerpt: extractedData.excerpt,
        allFields: Object.keys(extractedData)
      });
      
      return {
        referenceNumber: extractedData.referenceNumber || '',
        correspondenceRef: extractedData.correspondenceRef || '',
        date: extractedData.date || '',
        audience: extractedData.audience || '',
        title: extractedData.title || '',
        details: extractedData.details || '',
        excerpt: extractedData.excerpt || '',
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
        excerpt: '',
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
