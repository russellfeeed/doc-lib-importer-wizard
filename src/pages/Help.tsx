import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, FileSignature, Shield, Upload, Download, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const Help: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center mb-6">
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </div>

      <h1 className="text-3xl font-bold mb-4">Help & Documentation</h1>
      <p className="text-gray-600 mb-8">
        Learn how to upload, process, and import different types of documents into your WordPress Document Library.
      </p>

      {/* Overview */}
      <Card className="p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4">Overview</h2>
        <p className="text-gray-700 mb-4">
          This Document Management System helps you process documents and generate CSV files for import into the WordPress Barn2 Document Library plugin. 
          The system uses AI to automatically extract metadata, categorize documents, and generate structured data ready for WordPress import.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 mb-1">Important Setup Steps</h4>
              <p className="text-blue-800 text-sm">
                Before importing any CSV, ensure all document files are uploaded to your WordPress Media Library. 
                The CSV contains file paths that reference these uploaded documents.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Document Types */}
      <Card className="p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-6">Document Types</h2>
        
        <div className="space-y-6">
          {/* Document Library */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-blue-100 p-2 rounded-full">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold">Document Library</h3>
            </div>
            <p className="text-gray-700 mb-3">
              General document management for any type of organizational documents. Perfect for policies, procedures, reports, and general business documents.
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>AI categorizes documents using your WordPress categories</li>
              <li>Automatic title, excerpt, and tag generation</li>
              <li>Supports custom fields and metadata</li>
              <li>Flexible categorization based on your existing taxonomy</li>
            </ul>
          </div>

          {/* Circular Letters */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-green-100 p-2 rounded-full">
                <FileSignature className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold">Circular Letters</h3>
            </div>
            <p className="text-gray-700 mb-3">
              Specialized processing for circular letters, announcements, and official communications with structured information extraction.
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>Extracts reference numbers automatically</li>
              <li>Identifies dates, audiences, and authors</li>
              <li>Structured title and detail extraction</li>
              <li>Perfect for official communications and announcements</li>
            </ul>
          </div>

          {/* Standards on Subscription */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-red-100 p-2 rounded-full">
                <Shield className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold">Standards on Subscription</h3>
            </div>
            <p className="text-gray-700 mb-3">
              Dedicated processing for technical standards with automatic categorization into System or Service standards only.
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>Only two valid categories: "Standards {`>`} System" and "Standards {`>`} Service"</li>
              <li>Specialized for technical standards documents</li>
              <li>Automatic classification based on content analysis</li>
              <li>Streamlined workflow for standards management</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Workflow */}
      <Card className="p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-6">Upload & Processing Workflow</h2>
        
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm">1</div>
            <div>
              <h3 className="font-semibold mb-2">Upload Documents</h3>
              <p className="text-gray-700 text-sm mb-2">
                Select your document type and upload files (PDF, DOC, DOCX supported). Enable AI processing for automatic metadata extraction.
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Upload className="h-4 w-4" />
                <span>Drag & drop or browse to select files</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm">2</div>
            <div>
              <h3 className="font-semibold mb-2">Review & Edit Metadata</h3>
              <p className="text-gray-700 text-sm mb-2">
                Review AI-generated titles, excerpts, categories, and tags. Edit any information as needed. Use the "Edit All" mode for bulk operations.
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Set publish status (published/draft)</li>
                <li>Adjust categories and tags</li>
                <li>Modify titles and excerpts</li>
                <li>Add custom fields if needed</li>
              </ul>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm">3</div>
            <div>
              <h3 className="font-semibold mb-2">Generate CSV</h3>
              <p className="text-gray-700 text-sm mb-2">
                Generate a CSV file containing all document metadata formatted for WordPress import.
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Download className="h-4 w-4" />
                <span>Download or copy CSV data</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Category Manager */}
      <Card className="p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-6">Category Manager Setup</h2>
        
        <p className="text-gray-700 mb-4">
          To ensure proper categorization of your documents, you can import categories directly from your WordPress site's 
          Document Library taxonomy. This ensures consistency between your processing system and WordPress.
        </p>
        
        <div className="space-y-4">
          <div className="border-l-4 border-green-500 pl-4">
            <h3 className="font-semibold mb-2">Step 1: Set Up WordPress Credentials</h3>
            <p className="text-gray-700 text-sm mb-2">
              Navigate to Categories in the main menu and locate the WordPress Category Import section.
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li><strong>WordPress URL:</strong> Set in Settings (e.g. https://members.nsi.org.uk/)</li>
              <li><strong>Username & Password:</strong> Create these credentials in WordPress under Users → Add New</li>
              <li>Ensure the user has appropriate permissions to access the Document Library categories</li>
            </ul>
          </div>
          
          <div className="border-l-4 border-green-500 pl-4">
            <h3 className="font-semibold mb-2">Step 2: Import Categories</h3>
            <p className="text-gray-700 text-sm mb-2">
              Once credentials are configured, fetch and import your WordPress doc_categories taxonomy.
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>Click "Fetch Categories" to preview available categories</li>
              <li>Choose to merge with existing categories or replace them entirely</li>
              <li>Categories will be imported with their hierarchical structure preserved</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* WordPress Import */}
      <Card className="p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-6">WordPress Import Process</h2>
        
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-900 mb-1">Prerequisites</h4>
              <p className="text-amber-800 text-sm">
                Before importing the CSV, you must upload all document files to your WordPress Media Library. 
                The CSV references these files by their media library URLs.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="font-semibold mb-2">Step 1: Upload Documents to Media Library</h3>
            <p className="text-gray-700 text-sm">
              In your WordPress admin, go to Media {`>`} Add New and upload all the document files you processed. 
              Note the file names and locations for reference.
            </p>
          </div>

          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="font-semibold mb-2">Step 2: Import CSV via Barn2 Plugin</h3>
            <p className="text-gray-700 text-sm mb-3">
              Use the Barn2 Document Library plugin's import feature to import your generated CSV file. 
              The plugin will create document entries linking to your uploaded files.
            </p>
            <p className="text-sm text-blue-600">
              <a 
                href={`${((() => { try { const s = JSON.parse(localStorage.getItem('wp_site_url') || '""'); return typeof s === 'string' && s ? s.replace(/\/+$/, '') : 'https://dev.members.nsi.org.uk'; } catch { return 'https://dev.members.nsi.org.uk'; } })())}/wp-admin/admin.php?page=dlp_import_csv`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline hover:text-blue-800"
              >
                → Import Documents CSV in WordPress
              </a>
            </p>
          </div>

          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="font-semibold mb-2">Step 3: Manage Publication Status</h3>
            <p className="text-gray-700 text-sm">
              Document publication status can be set either during the editing process in this tool, 
              or later in WordPress under Documents {`>`} All Documents. You can bulk edit publication status as needed.
            </p>
          </div>
        </div>
      </Card>

      {/* Tips */}
      <Card className="p-6">
        <h2 className="text-2xl font-semibold mb-4">Tips & Best Practices</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h3 className="font-semibold text-green-700">Do:</h3>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              <li>Review AI-generated content before finalizing</li>
              <li>Use consistent naming conventions</li>
              <li>Upload files to WordPress Media Library first</li>
              <li>Test with a small batch before bulk importing</li>
              <li>Keep file names descriptive and unique</li>
            </ul>
          </div>
          
          <div className="space-y-3">
            <h3 className="font-semibold text-red-700">Don't:</h3>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              <li>Import CSV without uploading files first</li>
              <li>Use special characters in file names</li>
              <li>Skip the review and editing step</li>
              <li>Import duplicate documents</li>
              <li>Forget to set appropriate publication status</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Help;