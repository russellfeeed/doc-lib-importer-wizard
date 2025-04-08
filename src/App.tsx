
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import DocumentImporter from '@/components/DocumentImporter';
import CircularLetterManager from '@/components/CircularLetterManager';
import Index from '@/pages/Index';
import Categories from '@/pages/Categories';
import CircularLetters from '@/pages/CircularLetters';
import NotFound from '@/pages/NotFound';
import { CategoryProvider } from '@/context/CategoryContext';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <CategoryProvider>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/documents" element={<DocumentImporter />} />
          <Route path="/circular-letters" element={<CircularLetters />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster position="top-right" />
      </CategoryProvider>
    </div>
  );
}

export default App;
