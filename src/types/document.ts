export interface DocumentFile {
  id: string;
  file: File;
  name: string;
  fileSize: string;
  fileType: string;
  excerpt: string;
  categories: string;
  tags: string;
  authors: string;
  fileUrl: string;
  directUrl: string;
  imageUrl: string;
  content: string;
  published: boolean;
  omitFromCSV?: boolean;
  customFields: Record<string, string>;
  customTaxonomies: Record<string, string>;
  isProcessing?: boolean;
  processingError?: string;
  thumbnail?: string;
  // Standards-specific fields
  standardNumber?: string;
  documentTitle?: string;
  aiProcessing?: {
    status: 'idle' | 'processing' | 'completed' | 'error';
    error?: string;
    model?: string;
    tokensUsed?: number;
  };
  wpExisting?: {
    id: number;
    title: string;
    status: string;
    link: string;
    date: string;
  } | null;
}

export interface CSVData {
  Name: string;
  Categories: string;
  Tags: string;
  'Document Authors': string;
  'File URL': string;
  'Direct URL': string;
  'Featured Image URL': string;
  'File Size': string;
  Excerpt: string;
  Content: string;
  Published: string;
  [key: string]: string;
}

export interface AiProcessingOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AppendixItem {
  title: string;
  content: string;
}
