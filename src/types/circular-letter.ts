import { AppendixItem } from "./document";

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
  categories?: string; // Added categories field
  content: string;
  appendices: AppendixItem[];
  thumbnail?: string;
  isProcessing: boolean;
  processingError?: string;
  aiProcessing: {
    status: 'idle' | 'processing' | 'completed' | 'error';
    error?: string;
    model?: string;
  };
}
