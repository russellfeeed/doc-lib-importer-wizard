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
  standardsCategorization: PromptConfig;
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

CRITICAL RULES - READ CAREFULLY:
1. You MUST only return category paths that exist EXACTLY as shown in the hierarchy below
2. You CANNOT skip levels in the hierarchy - every level must be included in the path
3. For top-level categories, return just the name (e.g., "Gold")
4. For subcategories, include ALL parent levels using " > " separator (e.g., "Gold > ARC > Regulations and Approval Criteria")
5. Do not create shortcuts or skip intermediate levels
6. Do not make categories up or combine categories that aren't direct parent-child relationships
7. If the document doesn't fit any category well, return "uncategorised"

EXAMPLES OF CORRECT PATHS (based on the hierarchy):
- "Gold" (top level)
- "Gold > ARC > Regulations and Approval Criteria" (full path required)
- "Gold > Fire > Technical Bulletins" (full path required)

EXAMPLES OF INCORRECT PATHS:
- "Gold > Regulations and Approval Criteria" (skips ARC level - WRONG)
- "Fire > Gold" (wrong order - WRONG)

AVAILABLE CATEGORY HIERARCHY:
{categories}

VALIDATION STEP: Before answering, trace your chosen path in the hierarchy above to ensure every level exists and is connected correctly.

Only return the exact category path, nothing else.

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
  },
  standardsCategorization: {
    systemPrompt: "You are a standards document categorization specialist. Your task is to analyze standards documents and categorize them as either 'Standards > System' or 'Standards > Service' based on their content and focus.",
    userPromptTemplate: `Analyze this standards document titled "{fileName}" and determine whether it should be categorized as "Standards > System" or "Standards > Service".

CATEGORY DEFINITIONS:
- "Standards > System": Standards that focus on technical systems, infrastructure, architecture, hardware, software, technical specifications, protocols, interfaces, security frameworks, databases, networks, platforms, APIs, technical design, configuration, installation, deployment, or technical maintenance.

- "Standards > Service": Standards that focus on service delivery, business processes, procedures, quality management, customer service, user experience, operational workflows, governance, compliance, auditing, performance management, service monitoring, reporting, documentation practices, training, or service assessment.

CRITICAL RULES:
1. You MUST return EXACTLY one of these two categories: "Standards > System" OR "Standards > Service"
2. Base your decision on the PRIMARY focus and intent of the document
3. If a document covers both areas, choose the category that represents the MAIN emphasis
4. Do not return any other text - only the exact category path

Analyze the document content and return the appropriate category:

Document content:
{content}`,
    model: "gpt-4o-mini",
    temperature: 0.3,
    maxTokens: 100
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
    if (configs.summarization && configs.categorization && configs.tagGeneration && configs.circularLetters && configs.standardsCategorization) {
      saveAllPromptConfigs(configs);
    } else {
      throw new Error("Invalid prompt configuration format");
    }
  } catch (error) {
    throw new Error("Failed to import prompt configurations: " + (error as Error).message);
  }
}