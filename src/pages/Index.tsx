
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { FileText, FileSignature, BarChart3, Settings, Shield, HelpCircle, AlertTriangle, Copy, Link2 } from 'lucide-react';
import { hasOpenAIKey } from '@/utils/openaiClient';
import { hasWordPressSettings } from '@/utils/settingsUtils';

const Index: React.FC = () => {
  const [showWarningModal, setShowWarningModal] = useState(false);
  const navigate = useNavigate();

  const handleSimpleDocumentsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    const hasOpenAI = hasOpenAIKey();
    const hasWordPress = hasWordPressSettings();
    
    if (!hasOpenAI || !hasWordPress) {
      setShowWarningModal(true);
    } else {
      navigate('/simple-documents');
    }
  };

  const handleProceedAnyway = () => {
    setShowWarningModal(false);
    navigate('/simple-documents');
  };

  const handleGoToSettings = () => {
    setShowWarningModal(false);
    navigate('/settings');
  };

  const missingSettings = [];
  if (!hasOpenAIKey()) missingSettings.push('OpenAI API Key');
  if (!hasWordPressSettings()) missingSettings.push('WordPress credentials');

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Document Management System</h1>
      <p className="text-gray-600 mb-8">
        Upload, categorize, and manage your documents with AI-powered information extraction.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link to="/documents" className="hover:no-underline">
          <Card className="p-6 hover:shadow-md transition-shadow">
            <div className="flex flex-col items-center text-center">
              <div className="bg-blue-100 p-4 rounded-full mb-4">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Document Library</h2>
              <p className="text-gray-600">
                Upload and manage documents. AI will help categorize and tag documents automatically.
              </p>
            </div>
          </Card>
        </Link>

        <div onClick={handleSimpleDocumentsClick} className="hover:no-underline cursor-pointer">
          <Card className="p-6 hover:shadow-md transition-shadow">
            <div className="flex flex-col items-center text-center">
              <div className="bg-indigo-100 p-4 rounded-full mb-4">
                <FileText className="h-8 w-8 text-indigo-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Simple Document Library</h2>
              <p className="text-gray-600">
                Simplified document upload and management with streamlined workflow.
              </p>
            </div>
          </Card>
        </div>

        <Link to="/circular-letters" className="hover:no-underline">
          <Card className="p-6 hover:shadow-md transition-shadow">
            <div className="flex flex-col items-center text-center">
              <div className="bg-green-100 p-4 rounded-full mb-4">
                <FileSignature className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Circular Letters</h2>
              <p className="text-gray-600">
                Manage circular letters and announcements with AI-powered information extraction.
              </p>
            </div>
          </Card>
        </Link>

        <Link to="/standards" className="hover:no-underline">
          <Card className="p-6 hover:shadow-md transition-shadow">
            <div className="flex flex-col items-center text-center">
              <div className="bg-red-100 p-4 rounded-full mb-4">
                <Shield className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Standards on Subscription</h2>
              <p className="text-gray-600">
                Upload and manage standards documents with automatic categorization as System or Service standards.
              </p>
            </div>
          </Card>
        </Link>

        <Link to="/categories" className="hover:no-underline">
          <Card className="p-6 hover:shadow-md transition-shadow">
            <div className="flex flex-col items-center text-center">
              <div className="bg-purple-100 p-4 rounded-full mb-4">
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Category Manager</h2>
              <p className="text-gray-600">
                Create and manage document categories to keep your library organized.
              </p>
            </div>
          </Card>
        </Link>

        <Link to="/settings" className="hover:no-underline">
          <Card className="p-6 hover:shadow-md transition-shadow">
            <div className="flex flex-col items-center text-center">
              <div className="bg-orange-100 p-4 rounded-full mb-4">
                <Settings className="h-8 w-8 text-orange-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2">AI Settings</h2>
              <p className="text-gray-600">
                Customize AI prompts and models for document processing and analysis.
              </p>
            </div>
          </Card>
        </Link>

        <Link to="/wp-duplicate-audit" className="hover:no-underline">
          <Card className="p-6 hover:shadow-md transition-shadow">
            <div className="flex flex-col items-center text-center">
              <div className="bg-rose-100 p-4 rounded-full mb-4">
                <Copy className="h-8 w-8 text-rose-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2">WordPress Duplicate Audit</h2>
              <p className="text-gray-600">
                Scan WordPress Document Library for duplicate entries with matching standard numbers.
              </p>
            </div>
          </Card>
        </Link>

        <Link to="/document-url-audit" className="hover:no-underline">
          <Card className="p-6 hover:shadow-md transition-shadow">
            <div className="flex flex-col items-center text-center">
              <div className="bg-amber-100 p-4 rounded-full mb-4">
                <Link2 className="h-8 w-8 text-amber-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Document URL Audit</h2>
              <p className="text-gray-600">
                Pick a Document Library category and verify every document's file URL resolves to a real PDF.
              </p>
            </div>
          </Card>
        </Link>

        <Link to="/help" className="hover:no-underline">
          <Card className="p-6 hover:shadow-md transition-shadow">
            <div className="flex flex-col items-center text-center">
              <div className="bg-cyan-100 p-4 rounded-full mb-4">
                <HelpCircle className="h-8 w-8 text-cyan-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Help & Documentation</h2>
              <p className="text-gray-600">
                Learn how to upload, process, and import documents into WordPress.
              </p>
            </div>
          </Card>
        </Link>
      </div>

      <Dialog open={showWarningModal} onOpenChange={setShowWarningModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Configuration Required
            </DialogTitle>
            <DialogDescription>
              The following settings are missing and required for optimal functionality:
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <ul className="space-y-2">
              {missingSettings.map((setting, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-amber-500 rounded-full" />
                  {setting}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-muted-foreground">
              You can proceed without these settings, but some features may not work properly.
            </p>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowWarningModal(false)}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={handleProceedAnyway}>
              Proceed Anyway
            </Button>
            <Button onClick={handleGoToSettings}>
              Go to Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
