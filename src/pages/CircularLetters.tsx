
import React from 'react';
import CircularLetterManager from '@/components/CircularLetterManager';

const CircularLetters: React.FC = () => {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Circular Letters Manager</h1>
      <p className="text-gray-600 mb-8">
        Upload, manage, and export circular letters. Our AI automatically extracts reference numbers, 
        dates, audiences, titles, details, and authors from your documents.
      </p>
      
      <CircularLetterManager />
    </div>
  );
};

export default CircularLetters;
