import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Tag, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSimpleFileUpload } from '@/hooks/useSimpleFileUpload';
import SimpleDocumentEditor from '@/components/SimpleDocumentEditor';
import CSVGenerator from '@/components/CSVGenerator';
import WordPressUploader from '@/components/WordPressUploader';
import { DocumentFile } from '@/types/document';
import { Steps, StepType } from '@/types/steps';
import { fetchWordPressTaxonomies } from '@/utils/wordpressUtils';

// Simple File Uploader Component
const SimpleFileUploader = ({ onFilesUploaded }: { onFilesUploaded: (files: DocumentFile[]) => void }) => {
  const {
    files,
    isDragging,
    isLoading,
    aiEnabled,
    forcedCategory,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileInputChange,
    handleRemoveFile,
    handleContinue,
    toggleAI,
    setForcedCategory
  } = useSimpleFileUpload({ onFilesUploaded });

  // WordPress categories state
  const [wpCategories, setWpCategories] = useState<any[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  // Load WordPress categories on component mount
  useEffect(() => {
    const loadWpCategories = async () => {
      setIsLoadingCategories(true);
      try {
        // Get WordPress credentials from localStorage
        const wpSiteUrl = localStorage.getItem('wp_site_url');
        const wpUsername = localStorage.getItem('wp_username');
        const wpPassword = localStorage.getItem('wp_password');

        if (wpSiteUrl && wpUsername && wpPassword) {
          const credentials = {
            url: wpSiteUrl,
            username: wpUsername,
            password: wpPassword
          };
          const categories = await fetchWordPressTaxonomies('doc_categories', credentials);
          setWpCategories(categories);
        }
      } catch (error) {
        console.error('Error loading WordPress categories:', error);
        setWpCategories([]);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    loadWpCategories();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-700">Upload Documents</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">AI Features (optional)</span>
          <button
            onClick={toggleAI}
            className={`w-10 h-6 rounded-full ${aiEnabled ? 'bg-blue-600' : 'bg-gray-300'} relative transition-colors`}
          >
            <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${aiEnabled ? 'translate-x-5' : 'translate-x-1'} absolute top-1`} />
          </button>
        </div>
      </div>

      {/* Category Selection */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Tag className="h-5 w-5 text-gray-500" />
          <label className="text-sm font-medium text-gray-700">
            Force Category (optional)
          </label>
        </div>
        <Select value={forcedCategory} onValueChange={setForcedCategory}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a category to apply to all documents (disables AI categorization)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              <span className="text-gray-500">Use AI categorization (default)</span>
            </SelectItem>
            {isLoadingCategories ? (
              <SelectItem value="loading" disabled>
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading categories...</span>
                </div>
              </SelectItem>
            ) : (
              wpCategories.map((category) => (
                <SelectItem key={category.id} value={category.name}>
                  {category.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {forcedCategory && forcedCategory !== 'none' && (
          <p className="text-sm text-amber-600">
            Category "{forcedCategory}" will be applied to all uploaded documents. AI categorization is disabled.
          </p>
        )}
      </div>

      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center ${
          isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.txt"
          onChange={handleFileInputChange}
          className="hidden"
          id="file-input"
        />
        <label htmlFor="file-input" className="cursor-pointer">
          <div className="text-gray-500">
            <svg className="mx-auto h-12 w-12 mb-4" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-lg font-medium">Drop files here or click to browse</p>
            <p className="text-sm">Support for PDF, DOC, DOCX, TXT files</p>
          </div>
        </label>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-700">Uploaded Files ({files.length})</h4>
          {files.map((file) => (
            <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="text-blue-600">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-gray-500">{file.fileSize} • {file.fileType}</p>
                </div>
              </div>
              <button
                onClick={() => handleRemoveFile(file.id)}
                className="text-red-600 hover:text-red-700"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Continue Button */}
      <div className="flex justify-end">
        <button
          onClick={handleContinue}
          disabled={files.length === 0 || isLoading || files.some(file => file.isProcessing)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Processing...' : 'Continue'}
        </button>
      </div>
    </div>
  );
};

const SimpleDocumentImporter: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<StepType>('upload');
  const [documents, setDocuments] = useState<DocumentFile[]>([]);

  const handleFilesUploaded = (files: DocumentFile[]) => {
    setDocuments(files);
    setCurrentStep('edit');
  };

  const handleDocumentsEdited = (editedDocs: DocumentFile[]) => {
    setDocuments(editedDocs);
    setCurrentStep('generate');
  };

  const handleBackToEdit = () => {
    setCurrentStep('edit');
  };

  const handleBackToUpload = () => {
    setCurrentStep('upload');
  };

  const handleWordPressUpload = () => setCurrentStep('wordpress-upload');
  const handleBackToCSV = () => setCurrentStep('generate');

  const handleReset = () => {
    setDocuments([]);
    setCurrentStep('upload');
  };

  const steps: Steps = {
    upload: {
      title: 'Upload Documents',
      description: 'Upload PDFs, Word documents, or other files',
      component: <SimpleFileUploader onFilesUploaded={handleFilesUploaded} />
    },
    edit: {
      title: 'Edit Document Information',
      description: 'Review and edit document information before generating CSV',
      component: (
        <SimpleDocumentEditor 
          documents={documents} 
          onSave={handleDocumentsEdited}
          onBack={handleBackToUpload}
        />
      )
    },
    generate: {
      title: 'Generate CSV',
      description: 'Download your CSV file for import into Barn2\'s Document Library',
      component: (
        <CSVGenerator 
          documents={documents} 
          onBack={handleBackToEdit}
          onReset={handleReset}
          onWordPressUpload={handleWordPressUpload}
        />
      )
    },
    'wordpress-upload': {
      title: 'Upload to WordPress',
      description: 'Upload selected documents to WordPress media library',
      component: (
        <WordPressUploader
          documents={documents}
          onBack={handleBackToCSV}
          onComplete={handleReset}
        />
      )
    }
  };

  const currentStepData = steps[currentStep];

  return (
    <div className="space-y-6">
      <div className="flex items-center mb-4">
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </div>
      
      <div className="flex justify-between items-center mb-10">
        <div className="flex space-x-2 md:space-x-4">
          {Object.entries(steps).map(([key, step], index) => (
            <div 
              key={key} 
              className="flex items-center"
            >
              <div 
                className={`rounded-full h-10 w-10 flex items-center justify-center ${
                  key === currentStep 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {index + 1}
              </div>
              <span 
                className={`ml-2 hidden md:block ${
                  key === currentStep ? 'text-blue-600 font-medium' : 'text-gray-500'
                }`}
              >
                {step.title}
              </span>
              {index < Object.keys(steps).length - 1 && (
                <div className="ml-2 md:ml-4 h-0.5 w-4 md:w-10 bg-gray-200"></div>
              )}
            </div>
          ))}
        </div>
      </div>

      <Card className="p-6 shadow-lg border-none">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">{currentStepData.title}</h2>
          <p className="text-gray-600">{currentStepData.description}</p>
        </div>
        <div>
          {currentStepData.component}
        </div>
      </Card>
    </div>
  );
};

export default SimpleDocumentImporter;