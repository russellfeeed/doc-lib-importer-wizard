import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { checkExistingDlpDocumentWithLogs, fetchDlpDocumentDetail } from '@/utils/wordpressUtils';

interface LogEntry {
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'detail';
}

interface WpDetailedMatch {
  id: number;
  title: string;
  status: string;
  link: string;
  date: string;
  excerpt?: string;
  categories?: string;
  tags?: string;
}

interface WpDuplicateCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  standardNumber: string;
  onMatchFound?: (match: WpDetailedMatch) => void;
}

const typeColors: Record<string, string> = {
  info: 'text-muted-foreground',
  success: 'text-green-600',
  warning: 'text-amber-600',
  error: 'text-destructive',
  detail: 'text-muted-foreground/70',
};

const WpDuplicateCheckModal: React.FC<WpDuplicateCheckModalProps> = ({
  isOpen,
  onClose,
  standardNumber,
  onMatchFound,
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string, type: LogEntry['type']) => {
    setLogs((prev) => [...prev, { timestamp: new Date(), message, type }]);
  };

  useEffect(() => {
    if (!isOpen) return;
    setLogs([]);
    setIsRunning(true);

    const run = async () => {
      const result = await checkExistingDlpDocumentWithLogs(standardNumber, addLog);
      if (result) {
        // Fetch full detail with resolved categories/tags
        addLog(`Fetching full document detail for ID ${result.id}...`, 'info');
        const detail = await fetchDlpDocumentDetail(result.id);
        
        const enrichedMatch: WpDetailedMatch = {
          ...result,
          excerpt: detail?.excerpt || '',
          categories: detail?.categories || '',
          tags: detail?.tags || '',
        };
        
        if (detail) {
          addLog(`Detail fetched — Categories: "${detail.categories}", Tags: "${detail.tags}"`, 'success');
        } else {
          addLog('Could not fetch full detail — comparison will be limited', 'warning');
        }
        
        if (onMatchFound) {
          onMatchFound(enrichedMatch);
        }
      }
      setIsRunning(false);
    };
    run();
  }, [isOpen, standardNumber]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>WordPress Duplicate Check</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[50vh] rounded border bg-muted/30 p-3" ref={scrollRef as any}>
          <div ref={scrollRef} className="space-y-0.5 font-mono text-xs">
            {logs.map((entry, i) => (
              <div key={i} className={`${typeColors[entry.type] || 'text-foreground'}`}>
                <span className="text-muted-foreground mr-2">[{formatTime(entry.timestamp)}]</span>
                {entry.message}
              </div>
            ))}
            {isRunning && (
              <div className="text-muted-foreground animate-pulse">Running...</div>
            )}
          </div>
        </ScrollArea>
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WpDuplicateCheckModal;
