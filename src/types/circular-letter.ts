
export interface CircularLetter {
  id: string;
  file: File;
  name: string;
  fileSize: string;
  fileType: string;
  referenceNumber: string;
  date: string;
  audience: string;
  title: string;
  details: string;
  author: string;
  content: string;
  isProcessing?: boolean;
  processingError?: string;
  aiProcessing?: {
    status: 'idle' | 'processing' | 'completed' | 'error';
    error?: string;
    model?: string;
    tokensUsed?: number;
  };
}
