
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import CircularLetterUploader from '@/components/circular-letter/CircularLetterUploader';
import CircularLetterEditor from '@/components/circular-letter/CircularLetterEditor';
import CSVGenerator from '@/components/CSVGenerator';
import { CircularLetter } from '@/types/circular-letter';
import { Steps, StepType } from '@/types/steps';

const CircularLetterManager: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<StepType>('upload');
  const [letters, setLetters] = useState<CircularLetter[]>([]);

  const handleLettersUploaded = (uploadedLetters: CircularLetter[]) => {
    setLetters(uploadedLetters);
    setCurrentStep('edit');
  };

  const handleLettersEdited = (editedLetters: CircularLetter[]) => {
    setLetters(editedLetters);
    setCurrentStep('generate');
  };

  const handleBackToEdit = () => {
    setCurrentStep('edit');
  };

  const handleBackToUpload = () => {
    setCurrentStep('upload');
  };

  const handleReset = () => {
    setLetters([]);
    setCurrentStep('upload');
  };

  const steps: Steps = {
    upload: {
      title: 'Upload Circular Letters',
      description: 'Upload PDF files containing circular letters or announcements',
      component: <CircularLetterUploader onLettersUploaded={handleLettersUploaded} />
    },
    edit: {
      title: 'Edit Circular Letter Information',
      description: 'Review and edit the automatically extracted information',
      component: (
        <CircularLetterEditor 
          letters={letters} 
          onSave={handleLettersEdited}
          onBack={handleBackToUpload}
        />
      )
    },
    generate: {
      title: 'Generate CSV',
      description: 'Download your CSV file for import into a document management system',
      component: (
        <CSVGenerator 
          documents={letters as any} 
          onBack={handleBackToEdit}
          onReset={handleReset}
        />
      )
    }
  };

  const currentStepData = steps[currentStep];

  return (
    <div className="space-y-6">
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

export default CircularLetterManager;
