export interface PromptConfig {
  systemPrompt: string;
  userPromptTemplate: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface AllPromptConfigs {
  summarization: PromptConfig;
  categorization: PromptConfig;
  tagGeneration: PromptConfig;
  circularLetters: PromptConfig;
}

const DEFAULT_PROMPTS: AllPromptConfigs = {
  summarization: {
    systemPrompt: "You are tasked with creating concise document summaries. Your summaries should be professional, factual, and never contain meta-text about AI or instructions.",
    userPromptTemplate: `Create a brief, professional summary of this document titled "{fileName}". The summary should be 2-3 sentences that capture the main topic and key points. Write in clear, straightforward language that would appear in a document management system. Do not include any meta-commentary about AI or summarization processes in your response.

Here is the document content:
{content}`,
    model: "gpt-4o-mini",
    temperature: 0.3,
    maxTokens: 300
  },
  categorization: {
    systemPrompt: "You are a document categorization assistant. Your task is to analyze document content and assign it to the EXACT category path that exists in the predefined hierarchy. You must only use categories and paths that are explicitly shown in the hierarchy structure.",
    userPromptTemplate: `Analyze this document titled "{fileName}" and determine the most appropriate category from the following hierarchy.

IMPORTANT RULES:
1. You MUST only return category paths that exist exactly as shown in the hierarchy below
2. If a document fits a top-level category, return just that category name (e.g., "Gold")
3. If it fits a subcategory, return the full path using " > " separator (e.g., "Parent Category > Child Category")
4. Do not create new categories or combine categories that aren't parent-child relationships
5. Do not make categories up
6. If the document doesn't fit any category well, flag the document as "uncategorised"

AVAILABLE CATEGORY HIERARCHY:
{categories}

VALIDATION: Before returning your answer, verify that the exact path you're suggesting appears in the hierarchy above. Only return paths that you can trace from parent to child in the structure.

Only return the category path, nothing else.

Document content:
{content}`,
    model: "gpt-4o-mini",
    temperature: 0.3,
    maxTokens: 300
  },
  tagGeneration: {
    systemPrompt: "You are an expert document tagger. Your task is to analyze documents and generate 1-5 relevant, concise tags that accurately reflect the document's content and themes.",
    userPromptTemplate: `Analyze this document titled "{fileName}" and generate 1-5 relevant tags. 
  
Return the tags as a comma-separated list (e.g., "compliance, regulations, safety"). Choose tags that accurately represent the main themes and topics of the document. Tags should be single words or short phrases, all lowercase.

Document content:
{content}`,
    model: "gpt-4o-mini",
    temperature: 0.3,
    maxTokens: 100
  },
  circularLetters: {
    systemPrompt: `You are a data extraction specialist that analyzes circular letters and extracts specific information from them. Your task is to extract the following information from the document:
1. Reference Number: The document's unique identifier or reference code
2. Correspondence Reference: Any internal reference numbers mentioned in the body of the document (different from the main reference number)
3. Date: The date when the circular letter was issued, in YYYY-MM-DD format
4. Audience: The intended recipients or departments that should read this circular
5. Title: The main title or subject of the circular letter
6. Details: The full content of the circular letter's main body, excluding headers, footers, salutations, signatures, and any appendices. This should only include the main text of the document.
7. Author/Sender: The person, department, or authority who issued the circular letter
8. Tags: Generate 1-5 relevant keywords or tags that describe the main topics of this circular letter, separated by commas
9. Appendices: If the document contains appendices, identify each one as a separate item with a title and content. Make sure the appendix content is NOT included in the main details field.

Format your response as a JSON object with these fields. If you cannot find a specific field, use an empty string as value. For appendices, return an array of objects, each with 'title' and 'content' fields. If there are no appendices, use an empty array.`,
    userPromptTemplate: `Extract information from this circular letter with filename "{fileName}".

Here is the document content:
{content}

Return a JSON object with the fields: referenceNumber, correspondenceRef, date, audience, title, details, author, tags, and appendices.
Make sure the appendices content is NOT included in the details field.`,
    model: "gpt-4o-mini",
    temperature: 0.3,
    maxTokens: 2000
  }
};

const STORAGE_KEY = "openai_prompts_config";

export function getPromptConfig(type: keyof AllPromptConfigs): PromptConfig {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const configs = JSON.parse(stored) as AllPromptConfigs;
      return configs[type] || DEFAULT_PROMPTS[type];
    } catch (error) {
      console.error("Error parsing stored prompt configs:", error);
    }
  }
  return DEFAULT_PROMPTS[type];
}

export function getAllPromptConfigs(): AllPromptConfigs {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const configs = JSON.parse(stored) as AllPromptConfigs;
      return { ...DEFAULT_PROMPTS, ...configs };
    } catch (error) {
      console.error("Error parsing stored prompt configs:", error);
    }
  }
  return DEFAULT_PROMPTS;
}

export function savePromptConfig(type: keyof AllPromptConfigs, config: PromptConfig): void {
  const current = getAllPromptConfigs();
  current[type] = config;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

export function saveAllPromptConfigs(configs: AllPromptConfigs): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
}

export function resetPromptConfig(type: keyof AllPromptConfigs): void {
  const current = getAllPromptConfigs();
  current[type] = DEFAULT_PROMPTS[type];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

export function resetAllPromptConfigs(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PROMPTS));
}

export function getDefaultPrompts(): AllPromptConfigs {
  return DEFAULT_PROMPTS;
}

export function exportPromptConfigs(): string {
  return JSON.stringify(getAllPromptConfigs(), null, 2);
}

export function importPromptConfigs(jsonString: string): void {
  try {
    const configs = JSON.parse(jsonString) as AllPromptConfigs;
    // Validate the structure
    if (configs.summarization && configs.categorization && configs.tagGeneration && configs.circularLetters) {
      saveAllPromptConfigs(configs);
    } else {
      throw new Error("Invalid prompt configuration format");
    }
  } catch (error) {
    throw new Error("Failed to import prompt configurations: " + (error as Error).message);
  }
}