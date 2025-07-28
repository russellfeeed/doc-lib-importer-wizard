
import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { FileText, FileSignature, BarChart3, Settings, Shield } from 'lucide-react';

const Index: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Document Management System</h1>
      <p className="text-gray-600 mb-8">
        Upload, categorize, and manage your documents with AI-powered information extraction.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
      </div>
    </div>
  );
};

export default Index;
