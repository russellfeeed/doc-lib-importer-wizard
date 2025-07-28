import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DocumentFile } from '@/types/document';
import { StepType } from '@/types/steps';
import FileUploader from '@/components/file-uploader/FileUploader';
import StandardsDocumentEditor from '@/components/StandardsDocumentEditor';
import CSVGenerator from '@/components/CSVGenerator';

const StandardsDocumentImporter: React.FC = () => {
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

  const steps = [
    {
      id: 'upload' as StepType,
      title: 'Upload Standards',
      description: 'Select and upload your standards documents',
      component: (
        <FileUploader
          onFilesUploaded={handleFilesUploaded}
        />
      )
    },
    {
      id: 'edit' as StepType,
      title: 'Edit Information',
      description: 'Review and edit document metadata',
      component: (
        <StandardsDocumentEditor
          documents={documents}
          onSave={handleDocumentsEdited}
          onBack={handleBackToUpload}
        />
      )
    },
    {
      id: 'generate' as StepType,
      title: 'Generate CSV',
      description: 'Download your processed documents as CSV',
      component: (
        <CSVGenerator
          documents={documents}
          onReset={handleReset}
          onBack={handleBackToEdit}
        />
      )
    }
  ];

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);
  const currentStepData = steps[currentStepIndex];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        {steps.map((step, index) => {
          const isActive = index === currentStepIndex;
          const isCompleted = index < currentStepIndex;
          
          return (
            <div key={step.id} className="flex items-center">
              <div className={`
                flex items-center justify-center w-10 h-10 rounded-full border-2 
                ${isActive ? 'border-blue-500 bg-blue-500 text-white' : 
                  isCompleted ? 'border-green-500 bg-green-500 text-white' : 
                  'border-gray-300 bg-white text-gray-500'}
              `}>
                {index + 1}
              </div>
              <div className={`ml-3 ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                <div className="text-sm font-medium">{step.title}</div>
                <div className="text-xs">{step.description}</div>
              </div>
              {index < steps.length - 1 && (
                <ChevronRight className="mx-4 h-5 w-5 text-gray-400" />
              )}
            </div>
          );
        })}
      </div>

      {/* Current Step Content */}
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">{currentStepData.title}</h2>
          <p className="text-gray-600">{currentStepData.description}</p>
        </div>
        {currentStepData.component}
      </Card>
    </div>
  );
};

export default StandardsDocumentImporter;