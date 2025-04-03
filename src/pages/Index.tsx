
import React from 'react';
import DocumentImporter from '@/components/DocumentImporter';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50">
      <header className="container mx-auto py-6">
        <h1 className="text-3xl md:text-4xl font-bold text-blue-700">Document Library Importer</h1>
        <p className="text-gray-600 mt-2">
          Upload your documents to generate a CSV file for Barn2's Document Library WordPress plugin
        </p>
      </header>
      
      <main className="container mx-auto py-6">
        <DocumentImporter />
      </main>
      
      <footer className="container mx-auto py-6 mt-10 border-t border-blue-100 text-center text-gray-500 text-sm">
        &copy; {new Date().getFullYear()} Document Library Importer for Barn2's WordPress plugin
      </footer>
    </div>
  );
};

export default Index;
