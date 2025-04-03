
export interface AppendixItem {
  title: string;
  content: string;
}

export interface CircularLetter {
  id: string;
  file: File;
  name: string;
  fileSize: string;
  fileType: string;
  referenceNumber: string;
  correspondenceRef: string;
  date: string;
  audience: string;
  title: string;
  details: string;
  author: string;
  tags: string;
  content: string;
  appendices?: AppendixItem[];
  thumbnail?: string; // Field for storing the document's thumbnail image
  isProcessing?: boolean;
  processingError?: string;
  aiProcessing?: {
    status: 'idle' | 'processing' | 'completed' | 'error';
    error?: string;
    model?: string;
    tokensUsed?: number;
  };
}
