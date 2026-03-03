import React, { useState } from 'react';
import { CheckCircle, AlertTriangle, Upload, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { DocumentFile } from '@/types/document';
import { uploadAndUpdateDlpDocument } from '@/utils/wordpressUtils';

interface ComparisonRow {
  field: string;
  localValue: string;
  wpValue: string;
  isDifferent: boolean;
}

interface WpComparisonPanelProps {
  rows: ComparisonRow[];
  document: DocumentFile;
  onEdit: (field: keyof DocumentFile, value: string | boolean | Record<string, string>) => void;
}

const WpComparisonPanel: React.FC<WpComparisonPanelProps> = ({ rows, document, onEdit }) => {
  const [isUploading, setIsUploading] = useState(false);
  const hasDifferences = rows.some(r => r.isDifferent);
  const hasMatchedDoc = !!document.wpExisting?.id;
  const hasFile = !!document.file;

  const handleUploadAndUpdate = async () => {
    setIsUploading(true);
    try {
      const result = await uploadAndUpdateDlpDocument(document);
      if (result.success) {
        toast.success('File uploaded and WordPress document updated successfully');
        if (result.relativePdaPath) {
          onEdit('fileUrl', result.relativePdaPath);
        }
        if (result.pdaUrl) {
          onEdit('directUrl', result.pdaUrl);
        }
      } else {
        toast.error(`Upload failed: ${result.error}`);
      }
    } catch (err: any) {
      toast.error(`Upload error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="rounded-md border">
      <div className="px-3 py-2 border-b bg-muted/40 flex items-center gap-2 text-sm font-medium">
        {hasDifferences ? (
          <>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span>Differences found with WordPress</span>
          </>
        ) : (
          <>
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>All fields match WordPress</span>
          </>
        )}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-24">Field</TableHead>
            <TableHead>Local</TableHead>
            <TableHead>WordPress</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.field} className={row.isDifferent ? 'bg-amber-50 dark:bg-amber-950/20' : ''}>
              <TableCell className="font-medium text-xs">{row.field}</TableCell>
              <TableCell className="text-xs max-w-[200px] truncate" title={row.localValue}>
                {row.localValue || <span className="text-muted-foreground italic">empty</span>}
              </TableCell>
              <TableCell className="text-xs max-w-[200px] truncate" title={row.wpValue}>
                {row.wpValue || <span className="text-muted-foreground italic">empty</span>}
              </TableCell>
              <TableCell>
                {row.isDifferent ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                ) : (
                  <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {hasMatchedDoc && (
        <div className="p-3 border-t">
          <Button
            variant="default"
            className="w-full"
            onClick={handleUploadAndUpdate}
            disabled={isUploading || !hasFile}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading & Updating...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload to Media Library & Update Document Library
              </>
            )}
          </Button>
          {!hasFile && (
            <p className="text-xs text-muted-foreground mt-1">No local file available for upload</p>
          )}
        </div>
      )}
    </div>
  );
};

export default WpComparisonPanel;
