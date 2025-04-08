
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import CategoryManager from '@/components/category/CategoryManager';

const Categories: React.FC = () => {
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
      
      <h1 className="text-3xl font-bold mb-6">Document Categories</h1>
      <p className="text-gray-600 mb-8">
        Create and manage document categories for better organization and easier retrieval.
      </p>
      
      <CategoryManager />
    </div>
  );
};

export default Categories;
