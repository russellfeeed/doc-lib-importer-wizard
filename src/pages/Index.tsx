
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
        <div className="flex items-center mt-2 bg-blue-50 p-3 rounded-md border border-blue-100">
          <span className="text-blue-600 font-semibold flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2">
              <path d="M12 2v8a2 2 0 0 0 2 2h8" />
              <path d="M2 8v13a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V19" />
              <path d="M9 18v-9" />
              <path d="M9 9h11.5a2.5 2.5 0 0 1 0 5h-7" />
              <path d="M13 14h5.5a2.5 2.5 0 0 1 0 5H13" />
              <path d="M9 14h1" />
            </svg>
            OpenAI-powered document summarization with professional, concise excerpts!
          </span>
        </div>
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
