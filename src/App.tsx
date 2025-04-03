
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import DocumentImporter from '@/components/DocumentImporter';
import CircularLetterManager from '@/components/CircularLetterManager';
import Index from '@/pages/Index';
import Categories from '@/pages/Categories';
import CircularLetters from '@/pages/CircularLetters';
import NotFound from '@/pages/NotFound';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/documents" element={<DocumentImporter />} />
          <Route path="/circular-letters" element={<CircularLetters />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster position="top-right" />
      </div>
    </Router>
  );
}

export default App;
