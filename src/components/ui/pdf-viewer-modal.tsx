import React, { useMemo, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, AlertTriangle } from 'lucide-react';

interface PDFViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl?: string;
  pdfFile?: File;
  fileName: string;
}

export const PDFViewerModal: React.FC<PDFViewerModalProps> = ({
  isOpen,
  onClose,
  pdfUrl,
  pdfFile,
  fileName
}) => {
  const [frameError, setFrameError] = useState(false);

  // Create object URL for file if no URL provided
  const viewUrl = useMemo(() => {
    if (pdfUrl) return pdfUrl;
    if (pdfFile) return URL.createObjectURL(pdfFile);
    return '';
  }, [pdfUrl, pdfFile]);

  // Reset frame error when modal opens
  useEffect(() => {
    if (isOpen) {
      setFrameError(false);
    }
  }, [isOpen]);

  // Cleanup object URL when component unmounts or file changes
  React.useEffect(() => {
    return () => {
      if (pdfFile && !pdfUrl) {
        URL.revokeObjectURL(viewUrl);
      }
    };
  }, [viewUrl, pdfFile, pdfUrl]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = viewUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenInNewTab = () => {
    window.open(viewUrl, '_blank');
  };

  const handleFrameError = () => {
    setFrameError(true);
  };

  if (!viewUrl) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{fileName}</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenInNewTab}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 border rounded-lg overflow-hidden">
          {frameError ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4 text-center p-8">
              <AlertTriangle className="h-12 w-12 text-yellow-500" />
              <h3 className="text-lg font-semibold">PDF Preview Not Available</h3>
              <p className="text-muted-foreground max-w-md">
                Due to browser security policies, the PDF cannot be displayed in this modal. 
                Please use the buttons above to download or open the PDF in a new tab.
              </p>
              <Button onClick={handleOpenInNewTab} className="mt-4">
                <ExternalLink className="h-4 w-4 mr-2" />
                View PDF in New Tab
              </Button>
            </div>
          ) : (
            <iframe
              src={`${viewUrl}#toolbar=1&navpanes=1&scrollbar=1`}
              className="w-full h-full"
              title={fileName}
              onError={handleFrameError}
              onLoad={(e) => {
                // Check if iframe loaded successfully by trying to access its content
                try {
                  const iframe = e.target as HTMLIFrameElement;
                  // If this throws an error, it means CSP blocked the frame
                  if (iframe.contentDocument === null && iframe.contentWindow === null) {
                    handleFrameError();
                  }
                } catch {
                  handleFrameError();
                }
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};