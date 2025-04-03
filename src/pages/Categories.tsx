
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CategoryProvider } from '@/context/CategoryContext';
import CategoryManager from '@/components/category/CategoryManager';

const Categories = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50">
      <header className="container mx-auto py-6">
        <div className="mb-4">
          <Button asChild variant="ghost" size="sm" className="gap-2">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              Back to Document Importer
            </Link>
          </Button>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-blue-700">Document Categories</h1>
        <p className="text-gray-600 mt-2">
          Manage your document categorization hierarchy for better organization
        </p>
      </header>
      
      <main className="container mx-auto py-6">
        <CategoryProvider>
          <CategoryManager />
        </CategoryProvider>
      </main>
      
      <footer className="container mx-auto py-6 mt-10 border-t border-blue-100 text-center text-gray-500 text-sm">
        &copy; {new Date().getFullYear()} Document Library Importer for Barn2's WordPress plugin
      </footer>
    </div>
  );
};

export default Categories;
