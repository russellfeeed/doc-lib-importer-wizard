
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import CircularLetterManager from '@/components/CircularLetterManager';

const CircularLetters: React.FC = () => {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center mb-4">
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </div>
      
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
