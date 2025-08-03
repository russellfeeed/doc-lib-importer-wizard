import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink } from 'lucide-react';

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
  // Create object URL for file if no URL provided
  const viewUrl = useMemo(() => {
    if (pdfUrl) return pdfUrl;
    if (pdfFile) return URL.createObjectURL(pdfFile);
    return '';
  }, [pdfUrl, pdfFile]);

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
          <iframe
            src={`${viewUrl}#toolbar=1&navpanes=1&scrollbar=1`}
            className="w-full h-full"
            title={fileName}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};