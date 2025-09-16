
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Download, Copy, Check, ArrowRight, RefreshCw, Upload } from 'lucide-react';
import { DocumentFile } from '@/types/document';
import { CircularLetter } from '@/types/circular-letter';
import { generateCSV, copyToClipboard } from '@/utils/csvUtils';
import { toast } from 'sonner';

interface CSVGeneratorProps {
  documents: DocumentFile[] | CircularLetter[];
  onBack: () => void;
  onReset: () => void;
  onWordPressUpload?: () => void;
}

const CSVGenerator: React.FC<CSVGeneratorProps> = ({ 
  documents, 
  onBack,
  onReset,
  onWordPressUpload
}) => {
  const [csvContent, setCsvContent] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentCounts, setDocumentCounts] = useState<{ included: number; excluded: number }>({ included: 0, excluded: 0 });
  
  // Determine if we're dealing with circular letters
  const isCircularLetter = documents.length > 0 && 'referenceNumber' in documents[0];
  
  useEffect(() => {
    // Generate CSV when component mounts
    const generate = async () => {
      setIsGenerating(true);
      setError(null);
      
      try {
        const csv = generateCSV(documents);
        setCsvContent(csv);
        
        // Calculate document counts
        if (isCircularLetter) {
          // All circular letters are included
          setDocumentCounts({ included: documents.length, excluded: 0 });
        } else {
          const includedCount = documents.filter(doc => !(doc as DocumentFile).omitFromCSV).length;
          const excludedCount = documents.length - includedCount;
          setDocumentCounts({ included: includedCount, excluded: excludedCount });
        }
      } catch (error) {
        console.error('Error generating CSV:', error);
        setError('Failed to generate CSV. Please check the console for details.');
        toast.error('Error generating CSV');
      } finally {
        setIsGenerating(false);
      }
    };
    
    generate();
  }, [documents]);

  const getPredominantCategory = () => {
    if (isCircularLetter) return '';
    
    const categoryCount: Record<string, number> = {};
    
    documents.forEach(doc => {
      const docFile = doc as DocumentFile;
      if (docFile.categories && !docFile.omitFromCSV) {
        const categories = docFile.categories.split(',').map(cat => cat.trim());
        categories.forEach(category => {
          if (category) {
            categoryCount[category] = (categoryCount[category] || 0) + 1;
          }
        });
      }
    });
    
    const sortedCategories = Object.entries(categoryCount).sort(([,a], [,b]) => b - a);
    return sortedCategories.length > 0 ? sortedCategories[0][0] : '';
  };

  const handleDownload = () => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    // Use appropriate filename based on content type
    let filename = isCircularLetter ? 'circular-letters-export.csv' : 'document-library-import.csv';
    
    if (!isCircularLetter) {
      const predominantCategory = getPredominantCategory();
      if (predominantCategory) {
        const sanitizedCategory = predominantCategory.toLowerCase().replace(/[^a-z0-9]/g, '-');
        filename = `document-library-import-${sanitizedCategory}.csv`;
      }
    }
    
    link.setAttribute('download', filename);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV file downloaded');
  };

  const handleCopy = async () => {
    try {
      await copyToClipboard(csvContent);
      setIsCopied(true);
      toast.success('CSV content copied to clipboard');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
        <h3 className="text-lg font-semibold text-blue-700 mb-2">CSV File Ready</h3>
        <p className="text-gray-700 mb-2">
          {isCircularLetter 
            ? 'Your CSV file containing circular letter data has been generated and is ready to download.'
            : 'Your CSV file has been generated and is ready to import into Barn2\'s Document Library WordPress plugin.'
          }
        </p>
        <div className="bg-white rounded-md p-3 border border-blue-200 mb-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-green-700 font-medium">✓ {documentCounts.included} documents included</span>
            {documentCounts.excluded > 0 && (
              <span className="text-gray-600">⚬ {documentCounts.excluded} documents excluded</span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleDownload}
            disabled={isGenerating || !!error}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Download className="mr-2 h-4 w-4" />
            Download CSV
          </Button>
          <Button
            variant="outline"
            onClick={handleCopy}
            disabled={isGenerating || !!error}
          >
            {isCopied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
            {isCopied ? 'Copied!' : 'Copy to Clipboard'}
          </Button>
          {onWordPressUpload && (
            <Button
              variant="default"
              onClick={onWordPressUpload}
              disabled={isGenerating || !!error}
              className="bg-green-600 hover:bg-green-700"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload to WordPress
            </Button>
          )}
        </div>
      </div>
      
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-gray-50 p-3 border-b flex justify-between items-center">
          <h3 className="font-medium">CSV Preview</h3>
          <div className="text-sm text-gray-500">{documents.length} {isCircularLetter ? 'circular letters' : 'documents'}</div>
        </div>
        
        {isGenerating ? (
          <div className="p-6 text-center">
            <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-gray-500">Generating CSV...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-500">
            <p>{error}</p>
          </div>
        ) : (
          <pre className="bg-gray-900 text-green-400 p-4 font-mono text-sm overflow-x-auto whitespace-pre-wrap h-80">
            {csvContent}
          </pre>
        )}
      </div>
      
      <div className="bg-gray-50 rounded-lg p-6 border">
        <h3 className="font-semibold mb-2">Next Steps</h3>
        {isCircularLetter ? (
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Download your CSV file containing circular letter data</li>
            <li>Import this data into your document management system</li>
            <li>Use the provided metadata to organize and categorize your circular letters</li>
          </ol>
        ) : (
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Log in to your WordPress admin panel</li>
            <li>Go to Document Library <ArrowRight className="inline h-3 w-3" /> Import</li>
            <li>Upload the CSV file you just downloaded</li>
            <li>Map the fields according to the Barn2 documentation</li>
            <li>Complete the import process</li>
          </ol>
        )}
        
        {!isCircularLetter && (
          <div className="mt-4 space-y-2">
            <a 
              href="https://dev.members.nsi.org.uk/wp-admin/admin.php?page=dlp_import_csv" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline flex items-center"
            >
              → Import CSV in WordPress Document Library
            </a>
            <a 
              href="https://barn2.com/kb/add-import-documents/#bulk-import-documents" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline flex items-center"
            >
              View Barn2 Documentation
            </a>
          </div>
        )}
      </div>
      
      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Edit
        </Button>
        <Button variant="outline" onClick={onReset}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Start New Import
        </Button>
      </div>
    </div>
  );
};

export default CSVGenerator;
