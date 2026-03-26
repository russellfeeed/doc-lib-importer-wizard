import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronLeft, Upload, CheckCircle, XCircle, Loader2, Settings } from 'lucide-react';
import { DocumentFile } from '@/types/document';
import { CircularLetter } from '@/types/circular-letter';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getWordPressSettings, hasWordPressSettings } from '@/utils/settingsUtils';

interface WordPressUploaderProps {
  documents: DocumentFile[] | CircularLetter[];
  onBack: () => void;
  onComplete: () => void;
  isStandards?: boolean;
}

interface UploadResult {
  id: string;
  success: boolean;
  wpMediaId?: number;
  wpUrl?: string;
  error?: string;
}

// Helper function to convert File to base64
const convertFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = () => reject(new Error('Error reading file'));
    reader.readAsDataURL(file);
  });
};

const WordPressUploader: React.FC<WordPressUploaderProps> = ({ 
  documents, 
  onBack,
  onComplete,
  isStandards = false
}) => {
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [wpSettings, setWpSettings] = useState(getWordPressSettings());

  useEffect(() => {
    setWpSettings(getWordPressSettings());
  }, []);

  // Filter documents that have file URLs
  const uploadableDocuments = documents.filter(doc => {
    if ('referenceNumber' in doc) {
      // Circular letters - check if they have content or file data
      return doc.content || (doc as any).file;
    } else {
      // Regular documents - check for file URL
      const docFile = doc as DocumentFile;
      return docFile.fileUrl || docFile.file;
    }
  });

  const handleDocumentToggle = (docId: string) => {
    const newSelected = new Set(selectedDocuments);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocuments(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedDocuments.size === uploadableDocuments.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(uploadableDocuments.map(doc => doc.id)));
    }
  };

  const handleUpload = async () => {
    if (selectedDocuments.size === 0) {
      toast.error('Please select at least one document to upload');
      return;
    }

    if (!wpSettings) {
      toast.error('WordPress credentials not configured. Please configure them in Settings.');
      return;
    }

    setIsUploading(true);
    setUploadResults([]);

    try {
      // Filter selected documents
      const selectedDocs = uploadableDocuments.filter(doc => selectedDocuments.has(doc.id));
      
      // Batch size for uploads to prevent memory issues
      const BATCH_SIZE = 5;
      const totalBatches = Math.ceil(selectedDocs.length / BATCH_SIZE);
      
      console.log(`Uploading ${selectedDocs.length} documents in ${totalBatches} batches of ${BATCH_SIZE}`);
      
      let allResults: any[] = [];
      
      // Process documents in batches
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const start = batchIndex * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, selectedDocs.length);
        const batchDocs = selectedDocs.slice(start, end);
        
        console.log(`Processing batch ${batchIndex + 1}/${totalBatches} (documents ${start + 1}-${end})`);
        setUploadProgress(`Uploading batch ${batchIndex + 1} of ${totalBatches}...`);
        
        // Convert files to base64 for this batch only
        const documentsToUpload = await Promise.all(
          batchDocs.map(async (doc) => {
            if ('referenceNumber' in doc) {
              // Handle circular letters
              const file = (doc as any).file;
              const fileData = file ? await convertFileToBase64(file) : null;
              return {
                id: doc.id,
                name: doc.name,
                fileData,
                fileType: 'application/pdf',
              };
            } else {
              // Handle regular documents
              const docFile = doc as DocumentFile;
              const file = docFile.file;
              const fileData = file ? await convertFileToBase64(file) : null;

              // Get original file extension
              const originalExt = file?.name?.split('.').pop()?.toLowerCase() || 'pdf';

              let uploadName = isStandards && docFile.standardNumber
                ? `${docFile.standardNumber} - ${docFile.name}`
                : docFile.name;

              // Replace em dashes and en dashes with simple hyphens
              uploadName = uploadName.replace(/[–—]/g, '-').replace(/\+/g, '');

              // Ensure filename has proper extension
              if (!uploadName.toLowerCase().endsWith(`.${originalExt}`)) {
                uploadName = `${uploadName}.${originalExt}`;
              }

              return {
                id: doc.id,
                name: uploadName,
                fileData,
                fileType: docFile.fileType,
              };
            }
          })
        );

        console.log(`Uploading batch ${batchIndex + 1}:`, documentsToUpload.map(d => d.name));

        const { data, error } = await supabase.functions.invoke('wordpress-upload', {
          body: {
            documents: documentsToUpload,
            wpUrl: wpSettings.siteUrl,
            wpUsername: wpSettings.username,
            wpPassword: wpSettings.password,
            isStandards,
          }
        });

        if (error) {
          console.error(`Error in batch ${batchIndex + 1}:`, error);
          // Continue with remaining batches even if one fails
          allResults.push(...(data?.results || []));
        } else {
          allResults.push(...(data.results || []));
        }
        
        // Small delay between batches to allow garbage collection
        if (batchIndex < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      setUploadResults(allResults);
      setUploadComplete(true);

      // Calculate summary from all results
      const successful = allResults.filter(r => r.success).length;
      const failed = allResults.length - successful;
      
      if (successful > 0) {
        toast.success(`Successfully uploaded ${successful} document${successful !== 1 ? 's' : ''} to WordPress`);
      }
      if (failed > 0) {
        toast.error(`Failed to upload ${failed} document${failed !== 1 ? 's' : ''}`);
      }

    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload documents to WordPress');
    } finally {
      setIsUploading(false);
    }
  };

  if (uploadComplete) {
    const successCount = uploadResults.filter(r => r.success).length;
    const failureCount = uploadResults.length - successCount;

    return (
      <div className="space-y-6">
        <div className="bg-green-50 rounded-lg p-6 border border-green-100">
          <h3 className="text-lg font-semibold text-green-700 mb-2">Upload Complete</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-green-700 font-medium">✓ {successCount} documents uploaded successfully</span>
              {failureCount > 0 && (
                <span className="text-red-600">✗ {failureCount} documents failed</span>
              )}
            </div>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 p-3 border-b">
            <h3 className="font-medium">Upload Results</h3>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {uploadResults.map((result) => {
              const doc = uploadableDocuments.find(d => d.id === result.id);
              return (
                <div key={result.id} className="p-3 border-b last:border-b-0 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <div>
                      <div className="font-medium">{doc?.name}</div>
                      {result.success && result.wpUrl && (
                        <a 
                          href={result.wpUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 underline"
                        >
                          View in WordPress
                        </a>
                      )}
                      {!result.success && result.error && (
                        <div className="text-sm text-red-600">{result.error}</div>
                      )}
                    </div>
                  </div>
                  {result.success && (
                    <div className="text-sm text-gray-500">ID: {result.wpMediaId}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to CSV
          </Button>
          <Button onClick={onComplete}>
            Continue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
        <h3 className="text-lg font-semibold text-blue-700 mb-2">Upload to WordPress Media Library</h3>
        <p className="text-gray-700">
          Select documents to upload to your WordPress media library. Files will be uploaded using the WordPress REST API.
        </p>
      </div>

      {/* WordPress Settings Status */}
      <div className="border rounded-lg p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-medium">WordPress Settings</h3>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open('/settings', '_blank')}
          >
            <Settings className="mr-2 h-4 w-4" />
            Configure Settings
          </Button>
        </div>
        
        {wpSettings ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-green-700 font-medium">WordPress credentials configured</span>
            </div>
            <div className="mt-2 text-sm text-green-600">
              <div>Site URL: {wpSettings.siteUrl}</div>
              <div>Username: {wpSettings.username}</div>
            </div>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <span className="text-red-700 font-medium">WordPress credentials not configured</span>
            </div>
            <p className="mt-2 text-sm text-red-600">
              Please configure your WordPress settings before uploading documents.
            </p>
          </div>
        )}
      </div>

      {/* Document Selection */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-gray-50 p-3 border-b flex justify-between items-center">
          <h3 className="font-medium">Select Documents to Upload</h3>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              {selectedDocuments.size} of {uploadableDocuments.length} selected
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
            >
              {selectedDocuments.size === uploadableDocuments.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {uploadableDocuments.map((doc) => (
            <div key={doc.id} className="p-3 border-b last:border-b-0 flex items-center space-x-3">
              <Checkbox
                checked={selectedDocuments.has(doc.id)}
                onCheckedChange={() => handleDocumentToggle(doc.id)}
              />
              <div className="flex-1">
                <div className="font-medium">{doc.name}</div>
                <div className="text-sm text-gray-500">
                  {'referenceNumber' in doc ? 'Circular Letter' : (doc as DocumentFile).fileType}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to CSV
        </Button>
        <div className="flex items-center gap-4">
          {isUploading && uploadProgress && (
            <span className="text-sm text-gray-600">{uploadProgress}</span>
          )}
          <Button 
            onClick={handleUpload}
            disabled={isUploading || selectedDocuments.size === 0}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload to WordPress ({selectedDocuments.size})
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WordPressUploader;