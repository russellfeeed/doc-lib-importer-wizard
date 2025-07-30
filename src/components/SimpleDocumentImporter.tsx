import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import FileUploader from '@/components/FileUploader';
import SimpleDocumentEditor from '@/components/SimpleDocumentEditor';
import CSVGenerator from '@/components/CSVGenerator';
import { DocumentFile } from '@/types/document';
import { Steps, StepType } from '@/types/steps';

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

  const handleReset = () => {
    setDocuments([]);
    setCurrentStep('upload');
  };

  const steps: Steps = {
    upload: {
      title: 'Upload Documents',
      description: 'Upload PDFs, Word documents, or other files',
      component: <FileUploader onFilesUploaded={handleFilesUploaded} />
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