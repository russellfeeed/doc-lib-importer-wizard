import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronLeft, Upload, Eye, EyeOff, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { DocumentFile } from '@/types/document';
import { CircularLetter } from '@/types/circular-letter';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WordPressUploaderProps {
  documents: DocumentFile[] | CircularLetter[];
  onBack: () => void;
  onComplete: () => void;
}

interface UploadResult {
  id: string;
  success: boolean;
  wpMediaId?: number;
  wpUrl?: string;
  error?: string;
}

const WordPressUploader: React.FC<WordPressUploaderProps> = ({ 
  documents, 
  onBack,
  onComplete
}) => {
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [wpUrl, setWpUrl] = useState('https://dev.members.nsi.org.uk');
  const [wpUsername, setWpUsername] = useState('');
  const [wpPassword, setWpPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [uploadComplete, setUploadComplete] = useState(false);

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

    if (!wpUsername || !wpPassword) {
      toast.error('Please enter your WordPress credentials');
      return;
    }

    setIsUploading(true);
    setUploadResults([]);

    try {
      const documentsToUpload = uploadableDocuments
        .filter(doc => selectedDocuments.has(doc.id))
        .map(doc => {
          if ('referenceNumber' in doc) {
            // Handle circular letters
            return {
              id: doc.id,
              name: doc.name,
              fileUrl: '', // Circular letters don't have direct file URLs
              fileType: 'application/pdf',
            };
          } else {
            // Handle regular documents
            const docFile = doc as DocumentFile;
            return {
              id: doc.id,
              name: doc.name,
              fileUrl: docFile.fileUrl || '',
              fileType: docFile.fileType,
            };
          }
        });

      console.log('Uploading documents:', documentsToUpload);

      const { data, error } = await supabase.functions.invoke('wordpress-upload', {
        body: {
          documents: documentsToUpload,
          wpUrl,
          wpUsername,
          wpPassword,
        }
      });

      if (error) {
        throw error;
      }

      setUploadResults(data.results || []);
      setUploadComplete(true);

      const summary = data.summary;
      if (summary.successful > 0) {
        toast.success(`Successfully uploaded ${summary.successful} document(s) to WordPress`);
      }
      if (summary.failed > 0) {
        toast.error(`Failed to upload ${summary.failed} document(s)`);
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

      {/* WordPress Credentials */}
      <div className="border rounded-lg p-6 space-y-4">
        <h3 className="font-medium mb-4">WordPress Credentials</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="wp-url">WordPress Site URL</Label>
            <Input
              id="wp-url"
              value={wpUrl}
              onChange={(e) => setWpUrl(e.target.value)}
              placeholder="https://yoursite.com"
            />
          </div>
          <div>
            <Label htmlFor="wp-username">Username</Label>
            <Input
              id="wp-username"
              value={wpUsername}
              onChange={(e) => setWpUsername(e.target.value)}
              placeholder="WordPress username"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="wp-password">Application Password</Label>
          <div className="relative">
            <Input
              id="wp-password"
              type={showPassword ? 'text' : 'password'}
              value={wpPassword}
              onChange={(e) => setWpPassword(e.target.value)}
              placeholder="WordPress application password"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-auto p-1"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Use an Application Password for secure authentication. 
            <a 
              href={`${wpUrl}/wp-admin/profile.php`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline ml-1"
            >
              Create one here
            </a>
          </p>
        </div>
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
  );
};

export default WordPressUploader;