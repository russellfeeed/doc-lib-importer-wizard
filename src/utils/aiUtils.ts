import { toast } from "sonner";
import { hasOpenAIKey, summarizeWithOpenAI, categorizeWithOpenAI, generateTagsWithOpenAI, extractCircularLetterDataWithOpenAI, categorizeStandardsWithOpenAI } from "./openaiClient";
import { AiProcessingOptions } from "@/types/document";
import { CategoryNode } from "@/types/categories";
import { loadCategories } from "./categoryUtils";
import * as pdfjs from 'pdfjs-dist';
import { AppendixItem } from "@/types/circular-letter";

// Set worker path for pdf.js
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

// Generate a thumbnail for a PDF file
export async function generatePdfThumbnail(file: File): Promise<string> {
  try {
    // Convert the file to an ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF file
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    
    // Get the first page
    const page = await pdf.getPage(1);
    
    // Set viewport for thumbnail (scale down for thumbnail)
    const viewport = page.getViewport({ scale: 0.5 });
    
    // Create a canvas element
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('Could not get canvas context');
    }
    
    // Set canvas dimensions
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    // Render PDF page to canvas
    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;
    
    // Convert canvas to data URL
    const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7);
    
    // Clean up
    page.cleanup();
    
    return thumbnailUrl;
  } catch (error) {
    console.error('Error generating PDF thumbnail:', error);
    throw error;
  }
}

// Real AI service for document summarization using OpenAI
export async function generateDocumentSummary(
  content: string, 
  fileName: string,
  options?: AiProcessingOptions
): Promise<string> {
  // Check if API key is available
  if (!hasOpenAIKey()) {
    toast.error("OpenAI API key is not set. Please set your API key to use AI features.");
    throw new Error("OpenAI API key not set");
  }

  // Show toast to indicate processing
  toast.info(`Generating summary for ${fileName}...`);
  
  try {
    // Use the OpenAI client to generate a summary
    const summary = await summarizeWithOpenAI(content, fileName, options);
    
    // Return the AI-generated summary
    return summary;
  } catch (error) {
    console.error("AI processing error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    toast.error(`AI summarization failed: ${errorMessage}`);
    throw error;
  }
}

// AI service to determine the most appropriate category for a document
export async function generateDocumentCategory(
  content: string,
  fileName: string,
  categories?: CategoryNode[],
  options?: AiProcessingOptions
): Promise<string> {
  // Check if API key is available
  if (!hasOpenAIKey()) {
    toast.error("OpenAI API key is not set. Please set your API key to use AI features.");
    throw new Error("OpenAI API key not set");
  }

  // If no categories provided, load them from storage
  const categoryNodes = categories || loadCategories().categories;
  
  console.log("Categories being passed to AI categorization:", categoryNodes);
  
  if (!categoryNodes || categoryNodes.length === 0) {
    toast.warning("No categories available for AI categorization");
    return "";
  }

  // Show toast to indicate processing
  toast.info(`Analyzing document to determine category...`);
  
  try {
    // Use the OpenAI client to determine the category
    const categoryPath = await categorizeWithOpenAI(content, fileName, categoryNodes, options);
    
    // Return the AI-determined category
    return categoryPath;
  } catch (error) {
    console.error("AI categorization error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    toast.error(`AI categorization failed: ${errorMessage}`);
    return "";  // Return empty string on error
  }
}

// AI service to determine standards category (fixed to "Standards > System" or "Standards > Service")
export async function generateStandardsCategory(
  content: string,
  fileName: string,
  options?: AiProcessingOptions
): Promise<string> {
  // Check if API key is available
  if (!hasOpenAIKey()) {
    toast.error("OpenAI API key is not set. Please set your API key to use AI features.");
    throw new Error("OpenAI API key not set");
  }

  // Show toast to indicate processing
  toast.info(`Analyzing standards document to determine category...`);
  
  try {
    // Use the OpenAI client with the specialized standards categorization prompt
    const categoryPath = await categorizeStandardsWithOpenAI(content, fileName, options);
    
    // Return the AI-determined category
    return categoryPath;
  } catch (error) {
    console.error("Standards categorization error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    toast.error(`Standards categorization failed: ${errorMessage}`);
    return "Standards > System";  // Return default category on error
  }
}

// AI service to generate tags for a document
export async function generateDocumentTags(
  content: string,
  fileName: string,
  category?: string,
  options?: AiProcessingOptions
): Promise<string> {
  // Check if API key is available
  if (!hasOpenAIKey()) {
    toast.error("OpenAI API key is not set. Please set your API key to use AI features.");
    throw new Error("OpenAI API key not set");
  }

  // Show toast to indicate processing
  toast.info(`Generating tags for ${fileName}...`);
  
  try {
    // Use the OpenAI client to generate tags
    const tags = await generateTagsWithOpenAI(content, fileName, options);
    
    // Convert tags to lowercase
    const baseTags = tags.split(',').map(tag => tag.trim().toLowerCase());
    
    // Add category-based tag if category is provided
    if (category && category.trim()) {
      const categoryParts = category.split(' > ').map(part => part.trim());
      if (categoryParts.length >= 2) {
        // Create tag as "<2nd level> <top level>"
        const categoryTag = `${categoryParts[1]} ${categoryParts[0]}`.toLowerCase();
        // Only add if not already present
        if (!baseTags.includes(categoryTag)) {
          baseTags.push(categoryTag);
        }
      }
    }
    
    // Remove any duplicates from the final tag list
    const uniqueTags = [...new Set(baseTags)];
    
    return uniqueTags.join(', ');
  } catch (error) {
    console.error("AI tag generation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    toast.error(`AI tag generation failed: ${errorMessage}`);
    throw error;
  }
}

// Extract text from various document types
export async function extractTextFromDocument(file: File): Promise<string> {
  console.log(`Extracting text from document: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);
  
  try {
    // Handle different file types
    if (file.type === 'application/pdf') {
      return await extractTextFromPDF(file);
    } 
    else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
             file.type === 'application/msword') {
      // For now, we'll use a placeholder for Word documents
      // In a production app, you'd use mammoth.js or similar
      return `Content extracted from Word document: ${file.name}`;
    }
    else if (file.type === 'text/plain') {
      return await extractTextFromTxt(file);
    }
    else {
      // For other file types, return a placeholder
      return `Content from ${file.name} (${file.type})`;
    }
  } catch (error) {
    console.error(`Error extracting text from ${file.name}:`, error);
    return `Failed to extract content from ${file.name}. Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

// Extract text from PDF files using pdf.js
async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // Convert the file to an ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF file
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    console.log(`PDF loaded: ${file.name}, pages: ${pdf.numPages}`);
    
    let extractedText = '';
    
    // Process each page of the PDF
    for (let i = 1; i <= pdf.numPages; i++) {
      // Get the page
      const page = await pdf.getPage(i);
      
      // Extract text content from the page
      const textContent = await page.getTextContent();
      
      // Extract the text items
      const pageText = textContent.items
        .map(item => 'str' in item ? item.str : '')
        .join(' ');
      
      extractedText += pageText + ' ';
      
      // Clean up to prevent memory leaks
      page.cleanup();
    }
    
    console.log(`PDF text extraction completed for: ${file.name}`);
    return extractedText.trim();
  } catch (error) {
    console.error(`Error extracting PDF text from ${file.name}:`, error);
    throw new Error(`Failed to extract PDF text: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Extract text from plain text files
async function extractTextFromTxt(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error('Failed to read text file'));
      }
    };
    reader.onerror = () => reject(new Error('Error reading text file'));
    reader.readAsText(file);
  });
}

// Process a document with AI
export async function processDocumentWithAI(
  file: File,
  options?: AiProcessingOptions
): Promise<{ summary: string, content: string, category?: string, tags?: string }> {
  try {
    // 1. Extract text from document
    const extractedText = await extractTextFromDocument(file);
    
    // 2. Generate summary using OpenAI
    const summary = await generateDocumentSummary(extractedText, file.name, options);
    
    // 3. Determine appropriate category
    const category = await generateDocumentCategory(extractedText, file.name, undefined, options);
    
    // 4. Generate document tags (pass category for additional tag generation)
    const tags = await generateDocumentTags(extractedText, file.name, category, options);
    
    return {
      summary,
      content: extractedText,
      category,
      tags
    };
  } catch (error) {
    console.error("Error processing document with AI:", error);
    toast.error("Failed to process document with AI");
    throw error;
  }
}

// Process a standards document with AI using fixed categories
export async function processStandardsDocumentWithAI(
  file: File,
  options?: AiProcessingOptions
): Promise<{ summary: string, content: string, category?: string, tags?: string }> {
  try {
    // 1. Extract text from document
    const extractedText = await extractTextFromDocument(file);
    
    // 2. Generate summary using OpenAI
    const summary = await generateDocumentSummary(extractedText, file.name, options);
    
    // 3. Determine appropriate standards category (System or Service only)
    const category = await generateStandardsCategory(extractedText, file.name, options);
    
    // 4. Generate document tags (pass category for additional tag generation)
    const tags = await generateDocumentTags(extractedText, file.name, category, options);
    
    return {
      summary,
      content: extractedText,
      category,
      tags
    };
  } catch (error) {
    console.error("Error processing standards document with AI:", error);
    toast.error("Failed to process standards document with AI");
    throw error;
  }
}

// Process a circular letter with AI to extract specific fields
export async function processCircularLetterWithAI(
  file: File,
  options?: AiProcessingOptions
): Promise<{ 
  content: string, 
  referenceNumber: string,
  correspondenceRef: string,
  date: string,
  audience: string,
  title: string,
  details: string,
  author: string,
  tags: string,
  appendices: AppendixItem[]
}> {
  try {
    // 1. Extract text from document
    const extractedText = await extractTextFromDocument(file);
    
    // 2. Use AI to extract specific fields from the circular letter
    console.log("Extracting data from circular letter with AI...");
    const { 
      referenceNumber, 
      correspondenceRef,
      date, 
      audience, 
      title, 
      details, 
      author,
      tags,
      appendices
    } = await extractCircularLetterDataWithOpenAI(extractedText, file.name, options);
    
    console.log(`Extracted ${appendices.length} appendices from circular letter`);
    
    return {
      content: extractedText, // This is the raw, full content for reference
      referenceNumber,
      correspondenceRef,
      date,
      audience,
      title,
      details, // This should now exclude appendix content
      author,
      tags,
      appendices
    };
  } catch (error) {
    console.error("Error processing circular letter with AI:", error);
    toast.error("Failed to process circular letter with AI");
    throw error;
  }
}

export async function generateDocumentScheme(content: string, title: string): Promise<string> {
  console.log('generateDocumentScheme called with:', { title, contentLength: content.length });
  
  if (!hasOpenAIKey()) {
    console.log('No OpenAI key found for scheme generation');
    throw new Error('OpenAI API key not found');
  }

  if (!content || content.trim().length === 0) {
    console.log('No content provided for scheme generation');
    throw new Error('No content to analyze for scheme');
  }

  const apiKey = localStorage.getItem("openai_api_key");
  if (!apiKey) {
    console.log('No API key in localStorage for scheme generation');
    throw new Error("OpenAI API key not set");
  }

  // Get stored NSI schemes
  const storedSchemes = localStorage.getItem('nsi_schemes');
  console.log('Stored NSI schemes from localStorage:', storedSchemes);
  
  let availableSchemes = '';
  
  if (storedSchemes) {
    try {
      const schemes = JSON.parse(storedSchemes);
      console.log('Parsed NSI schemes:', schemes);
      availableSchemes = schemes.map((scheme: any) => scheme.name).join(', ');
      console.log('Available schemes string:', availableSchemes);
    } catch (error) {
      console.error('Error parsing stored NSI schemes:', error);
    }
  }

  if (!availableSchemes) {
    console.log('No NSI schemes available, falling back to default behavior');
    // Fallback to basic scheme generation
    const prompt = `
Analyze the following document and determine the most appropriate scheme classification.

Choose from typical schemes like "Security Standards", "Risk Management", "Compliance Frameworks", "Technical Guidelines", "Policy Documents", "Training Materials", "Assessment Tools", or similar relevant categories.

Document: ${title}
Content: ${content.substring(0, 2000)}

Return only the scheme name that best categorizes this document. No explanation, just the scheme name.
`;

    const requestBody = {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a document classification assistant. Return only the scheme name, no additional text." },
        { role: "user", content: prompt }
      ],
      max_tokens: 50,
      temperature: 0.3,
    };

    try {
      console.log('Making API call for scheme without constraints...');
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        console.log('API response not ok for scheme:', response.status);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('API response data for scheme:', data);
      const scheme = data.choices[0]?.message?.content?.trim() || '';
      console.log('Generated scheme:', scheme);
      return scheme;
    } catch (error) {
      console.error('Error generating scheme without constraints:', error);
      throw new Error('Failed to generate scheme');
    }
  }

  const prompt = `
Analyze the following document and determine the most appropriate NSI scheme classification.

Choose ONLY from these available NSI schemes: ${availableSchemes}

Document: ${title}
Content: ${content.substring(0, 2000)}

If the document matches multiple schemes, you can list them separated by commas (e.g. "Guarding, Cash Services").
Return only the exact scheme name(s) from the list above that best categorize this document. No explanation, just the scheme name(s).
`;

  const requestBody = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a document classification assistant. Return only the exact scheme name from the provided list, no additional text." },
      { role: "user", content: prompt }
    ],
    max_tokens: 50,
    temperature: 0.3,
  };

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const scheme = data.choices[0]?.message?.content?.trim() || '';
    return scheme;
  } catch (error) {
    console.error('Error generating scheme:', error);
    throw new Error('Failed to generate scheme');
  }
}

// Convert plain text to Markdown format for readability
export function convertToMarkdown(text: string): string {
  if (!text) return '';
  
  // Basic Markdown conversion
  let markdown = text;
  
  // Handle paragraphs - convert double line breaks to proper Markdown paragraphs
  markdown = markdown.replace(/\n\s*\n/g, '\n\n');
  
  // Handle headings - look for potential headings (uppercase lines or numbered sections)
  const lines = markdown.split('\n');
  const processedLines = lines.map(line => {
    // Check for potential headings (all caps or numbered sections)
    if (/^\d+\.\s+[A-Z][^a-z]*$/.test(line) || /^[A-Z][^a-z\d]{3,}$/.test(line)) {
      return `\n## ${line}\n`;
    }
    
    // Check for subheadings (lowercase numbered sections)
    if (/^\d+\.\d+\s+.+$/.test(line)) {
      return `\n### ${line}\n`;
    }
    
    return line;
  });
  
  markdown = processedLines.join('\n');
  
  // Handle lists - convert lines starting with * or - or numbered lists
  markdown = markdown.replace(/^(\s*)[•*-]\s+/gm, '$1* ');
  markdown = markdown.replace(/^(\s*)(\d+)[.)]\s+/gm, '$1$2. ');
  
  // Handle emphasis - convert certain patterns to bold
  markdown = markdown.replace(/\b(IMPORTANT|NOTE|WARNING):/g, '**$1:**');
  
  // Handle horizontal rules
  markdown = markdown.replace(/^[-*=]{3,}\s*$/gm, '\n---\n');
  
  return markdown;
}

export async function generateDocumentCategoryWithContext(content: string, title: string): Promise<string> {
  console.log('generateDocumentCategoryWithContext called with:', { title, contentLength: content.length });
  
  if (!hasOpenAIKey()) {
    console.log('No OpenAI key found');
    throw new Error('OpenAI API key not found');
  }

  if (!content || content.trim().length === 0) {
    console.log('No content provided');
    throw new Error('No content to categorize');
  }

  const apiKey = localStorage.getItem("openai_api_key");
  if (!apiKey) {
    console.log('No API key in localStorage');
    throw new Error("OpenAI API key not set");
  }
  
  // Get stored categories from Category Manager
  const storedCategories = localStorage.getItem('document_categories');
  console.log('Stored categories from Category Manager:', storedCategories);
  
  let availableCategories = '';
  
  if (storedCategories) {
    try {
      const categoryHierarchy = JSON.parse(storedCategories);
      console.log('Parsed category hierarchy:', categoryHierarchy);
      
      // Extract all category names from the hierarchy
      const extractCategoryNames = (categories: any[]): string[] => {
        const names: string[] = [];
        for (const category of categories) {
          names.push(category.name);
          if (category.children && category.children.length > 0) {
            names.push(...extractCategoryNames(category.children));
          }
        }
        return names;
      };
      
      const categoryNames = extractCategoryNames(categoryHierarchy.categories || []);
      availableCategories = categoryNames.join(', ');
      console.log('Extracted category names:', categoryNames);
      console.log('Available categories string:', availableCategories);
    } catch (error) {
      console.error('Error parsing stored categories:', error);
    }
  }

  if (!availableCategories) {
    console.log('No available categories from Category Manager, falling back to default behavior');
    // Instead of throwing an error, let's fall back to basic categorization
    const prompt = `
Based on the following document content and title, suggest an appropriate category for this document.

Title: ${title}
Content: ${content.substring(0, 2000)}

Please provide just the category name that best describes this document's content. Return only the category name, no explanation.
`;

    const requestBody = {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a document categorization assistant. Return only the category name, no additional text or explanation." },
        { role: "user", content: prompt }
      ],
      max_tokens: 50,
      temperature: 0.3,
    };

    try {
      console.log('Making API call without category constraints...');
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        console.log('API response not ok:', response.status);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('API response data:', data);
      const category = data.choices[0]?.message?.content?.trim() || '';
      console.log('Generated category:', category);
      return category;
    } catch (error) {
      console.error('Error generating category without constraints:', error);
      throw new Error('Failed to generate category');
    }
  }
  
  const prompt = `
Based on the following document content and title, suggest an appropriate category for this document.

Title: ${title}
Content: ${content.substring(0, 2000)}

Available categories: ${availableCategories}

Choose ONLY from the available categories above. Return only the exact category name, no explanation.
`;

  const requestBody = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a document categorization assistant. Return only the exact category name from the provided list, no additional text or explanation." },
      { role: "user", content: prompt }
    ],
    max_tokens: 50,
    temperature: 0.3,
  };

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const category = data.choices[0]?.message?.content?.trim() || '';
    return category;
  } catch (error) {
    console.error('Error generating category:', error);
    throw new Error('Failed to generate category');
  }
}

export async function generateDocumentTagsWithContext(content: string, title: string, categories?: string): Promise<string> {
  if (!hasOpenAIKey()) {
    throw new Error('OpenAI API key not found');
  }

  if (!content || content.trim().length === 0) {
    throw new Error('No content to tag');
  }

  const apiKey = localStorage.getItem("openai_api_key");
  if (!apiKey) {
    throw new Error("OpenAI API key not set");
  }
  
  // Get stored WordPress categories for context
  const storedCategories = localStorage.getItem('doc_categories');
  let categoryContext = '';
  
  if (storedCategories) {
    try {
      const cats = JSON.parse(storedCategories);
      categoryContext = cats.map((cat: any) => cat.name).join(', ');
    } catch (error) {
      console.error('Error parsing stored categories:', error);
    }
  }
  
  const prompt = `
Based on the following document content, title, and categories, suggest relevant tags for this document.

Title: ${title}
${categories ? `Categories: ${categories}` : ''}
${categoryContext ? `Available category context: ${categoryContext}` : ''}
Content: ${content.substring(0, 2000)}

Return only 3-5 relevant tags as a comma-separated list. All tags must be in lowercase. No explanations, just the tags.
`;

  const requestBody = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a document tagging assistant. Return only tags as a comma-separated list in lowercase, no additional text." },
      { role: "user", content: prompt }
    ],
    max_tokens: 100,
    temperature: 0.3,
  };

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const tags = data.choices[0]?.message?.content?.trim().toLowerCase() || '';
    return tags;
  } catch (error) {
    console.error('Error generating tags:', error);
    throw new Error('Failed to generate tags');
  }
}
