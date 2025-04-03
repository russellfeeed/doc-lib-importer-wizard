
import { toast } from "sonner";
import { hasOpenAIKey, summarizeWithOpenAI, categorizeWithOpenAI } from "./openaiClient";
import { AiProcessingOptions } from "@/types/document";
import { CategoryNode } from "@/types/categories";
import { loadCategories } from "./categoryUtils";

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

// Extract text from various document types
export async function extractTextFromDocument(file: File): Promise<string> {
  // For demo purposes, we'll return a placeholder text
  // In production, this would use libraries like pdf.js for PDFs,
  // mammoth for .docx, etc.
  
  return new Promise((resolve) => {
    setTimeout(() => {
      // This is a simplified mock implementation
      // In a real app, we would actually extract text from the document
      
      const mockContent = `This is extracted content from ${file.name}. 
In a real implementation, we would use libraries specific to each file type to extract the actual text content.
For PDFs, we might use pdf.js.
For Word documents, we might use mammoth.js.
For plain text files, we would simply read the file contents.
This extracted text would then be sent to an AI service for summarization.`;
      
      resolve(mockContent);
    }, 1000);
  });
}

// Process a document with AI
export async function processDocumentWithAI(
  file: File,
  options?: AiProcessingOptions
): Promise<{ summary: string, content: string, category?: string }> {
  try {
    // 1. Extract text from document
    const extractedText = await extractTextFromDocument(file);
    
    // 2. Generate summary using OpenAI
    const summary = await generateDocumentSummary(extractedText, file.name, options);
    
    // 3. Determine appropriate category
    const category = await generateDocumentCategory(extractedText, file.name, undefined, options);
    
    return {
      summary,
      content: extractedText,
      category
    };
  } catch (error) {
    console.error("Error processing document with AI:", error);
    toast.error("Failed to process document with AI");
    throw error;
  }
}
