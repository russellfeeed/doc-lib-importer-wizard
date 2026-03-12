import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, Loader2, XCircle, Circle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface UploadStep {
  label: string;
  status: 'pending' | 'active' | 'done' | 'error';
  detail?: string;
}

export interface UploadResult {
  mediaId?: number;
  sourceUrl?: string;
  pdaUrl?: string;
  relativePdaPath?: string;
  categoryIds?: number[];
  tagIds?: number[];
  resolvedCategories?: Record<string, number | null>;
  resolvedTags?: Record<string, number | null>;
  documentId?: number;
}

interface WpUploadProgressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  steps: UploadStep[];
  error?: string;
  result?: UploadResult;
}

const StepIcon: React.FC<{ status: UploadStep['status'] }> = ({ status }) => {
  switch (status) {
    case 'done':
      return <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />;
    case 'active':
      return <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0" />;
    case 'error':
      return <XCircle className="h-5 w-5 text-destructive shrink-0" />;
    default:
      return <Circle className="h-5 w-5 text-muted-foreground/40 shrink-0" />;
  }
};

const WpUploadProgressModal: React.FC<WpUploadProgressModalProps> = ({
  open,
  onOpenChange,
  steps,
  error,
  result,
}) => {
  const isComplete = steps.length > 0 && steps.every(s => s.status === 'done');
  const hasError = !!error || steps.some(s => s.status === 'error');
  const canClose = isComplete || hasError;

  return (
    <Dialog open={open} onOpenChange={canClose ? onOpenChange : undefined}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={e => !canClose && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>
            {hasError ? 'Upload Failed' : isComplete ? 'Upload Complete' : 'Uploading to WordPress…'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <StepIcon status={step.status} />
              <div className="min-w-0">
                <p className={`text-sm font-medium ${step.status === 'pending' ? 'text-muted-foreground' : ''}`}>
                  {step.label}
                </p>
                {step.detail && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate" title={step.detail}>
                    {step.detail}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {isComplete && result && (
          <div className="rounded-md border bg-muted/40 p-3 space-y-1.5 text-sm">
            {result.mediaId && (
              <p><span className="text-muted-foreground">Media ID:</span> <strong>{result.mediaId}</strong></p>
            )}
            {result.documentId && (
              <p><span className="text-muted-foreground">New Document ID:</span> <strong>{result.documentId}</strong></p>
            )}
            {result.sourceUrl && (
              <p className="flex items-center gap-1">
                <span className="text-muted-foreground">Source URL:</span>
                <a href={result.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline truncate inline-flex items-center gap-1">
                  {result.sourceUrl.split('/').pop()} <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              </p>
            )}
            {result.pdaUrl && (
              <p className="flex items-center gap-1">
                <span className="text-muted-foreground">Protected URL:</span>
                <span className="truncate">{result.pdaUrl}</span>
              </p>
            )}
            {result.resolvedCategories && Object.keys(result.resolvedCategories).length > 0 && (
              <div>
                <span className="text-muted-foreground">Categories:</span>
                {Object.entries(result.resolvedCategories).map(([name, id]) => (
                  <span key={name} className={`ml-1 ${id ? '' : 'text-destructive'}`}>
                    {name}{id ? ` → ${id}` : ' (not found)'}
                  </span>
                ))}
              </div>
            )}
            {result.resolvedTags && Object.keys(result.resolvedTags).length > 0 && (
              <div>
                <span className="text-muted-foreground">Tags:</span>
                {Object.entries(result.resolvedTags).map(([name, id]) => (
                  <span key={name} className={`ml-1 ${id ? '' : 'text-destructive'}`}>
                    {name}{id ? ` → ${id}` : ' (not found)'}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {canClose && (
          <div className="flex justify-end pt-1">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WpUploadProgressModal;
