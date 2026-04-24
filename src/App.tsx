
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import DocumentImporter from '@/components/DocumentImporter';
import SimpleDocuments from '@/pages/SimpleDocuments';
import Index from '@/pages/Index';
import Categories from '@/pages/Categories';
import CircularLetters from '@/pages/CircularLetters';
import StandardsSubscription from '@/pages/StandardsSubscription';
import Settings from '@/pages/Settings';
import Help from '@/pages/Help';
import WpDuplicateAudit from '@/pages/WpDuplicateAudit';
import NotFound from '@/pages/NotFound';
import Login from '@/pages/Login';
import AcceptInvite from '@/pages/AcceptInvite';
import AdminUsers from '@/pages/admin/Users';
import AppHeader from '@/components/AppHeader';
import ProtectedRoute from '@/components/ProtectedRoute';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { CategoryProvider } from '@/context/CategoryContext';

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  return (
    <>
      {session && <AppHeader />}
      {children}
    </>
  );
};

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AuthProvider>
        <CategoryProvider>
          <Shell>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/accept-invite" element={<AcceptInvite />} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/documents" element={<ProtectedRoute><DocumentImporter /></ProtectedRoute>} />
              <Route path="/simple-documents" element={<ProtectedRoute><SimpleDocuments /></ProtectedRoute>} />
              <Route path="/circular-letters" element={<ProtectedRoute><CircularLetters /></ProtectedRoute>} />
              <Route path="/standards" element={<ProtectedRoute><StandardsSubscription /></ProtectedRoute>} />
              <Route path="/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
              <Route path="/wp-duplicate-audit" element={<ProtectedRoute><WpDuplicateAudit /></ProtectedRoute>} />
              <Route path="/categories" element={<ProtectedRoute requireRole="admin"><Categories /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute requireRole="admin"><AdminUsers /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Shell>
          <Toaster position="top-right" />
        </CategoryProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
