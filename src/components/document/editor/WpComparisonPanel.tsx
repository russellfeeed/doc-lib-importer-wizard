import React, { useState } from 'react';
import { CheckCircle, AlertTriangle, Upload } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { DocumentFile } from '@/types/document';
import { uploadAndUpdateDlpDocument, type UploadProgressStep } from '@/utils/wordpressUtils';
import WpUploadProgressModal, { UploadStep, UploadResult } from './WpUploadProgressModal';

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

const initialSteps: UploadStep[] = [
  { label: 'Converting file to base64', status: 'pending' },
  { label: 'Uploading to Media Library & updating document', status: 'pending' },
  { label: 'Complete', status: 'pending' },
];

const WpComparisonPanel: React.FC<WpComparisonPanelProps> = ({ rows, document, onEdit }) => {
  const [showModal, setShowModal] = useState(false);
  const [steps, setSteps] = useState<UploadStep[]>(initialSteps);
  const [uploadError, setUploadError] = useState<string | undefined>();
  const [uploadResult, setUploadResult] = useState<UploadResult | undefined>();

  const hasDifferences = rows.some(r => r.isDifferent);
  const hasMatchedDoc = !!document.wpExisting?.id;
  const hasFile = !!document.file;
  const isUploading = showModal && !uploadResult && !uploadError;

  const updateStep = (index: number, updates: Partial<UploadStep>) => {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, ...updates } : s));
  };

  const handleUploadAndUpdate = async () => {
    setSteps(initialSteps.map(s => ({ ...s })));
    setUploadError(undefined);
    setUploadResult(undefined);
    setShowModal(true);

    try {
      const result = await uploadAndUpdateDlpDocument(document, (step, detail) => {
        if (step === 'converting') {
          updateStep(0, { status: 'active', detail });
        } else if (step === 'uploading') {
          updateStep(0, { status: 'done' });
          updateStep(1, { status: 'active', detail: 'Sending to WordPress…' });
        } else if (step === 'done') {
          updateStep(1, { status: 'done' });
          updateStep(2, { status: 'done' });
        }
      });

      if (result.success) {
        updateStep(1, { status: 'done' });
        updateStep(2, { status: 'done', detail: `Media ID: ${result.mediaId}` });
        setUploadResult({
          mediaId: result.mediaId,
          sourceUrl: result.sourceUrl,
          pdaUrl: result.pdaUrl,
          relativePdaPath: result.relativePdaPath,
        });
        toast.success('File uploaded and document updated');
        if (result.relativePdaPath) onEdit('fileUrl', result.relativePdaPath);
        if (result.pdaUrl) onEdit('directUrl', result.pdaUrl);
      } else {
        const failIdx = steps.findIndex(s => s.status === 'active' || s.status === 'pending');
        if (failIdx >= 0) updateStep(failIdx, { status: 'error' });
        setUploadError(result.error || 'Upload failed');
      }
    } catch (err: any) {
      setUploadError(err.message);
      setSteps(prev => prev.map(s => s.status === 'active' ? { ...s, status: 'error' } : s));
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
            <Upload className="mr-2 h-4 w-4" />
            Upload to Media Library & Update Document Library
          </Button>
          {!hasFile && (
            <p className="text-xs text-muted-foreground mt-1">No local file available for upload</p>
          )}
        </div>
      )}

      <WpUploadProgressModal
        open={showModal}
        onOpenChange={setShowModal}
        steps={steps}
        error={uploadError}
        result={uploadResult}
      />
    </div>
  );
};

export default WpComparisonPanel;
