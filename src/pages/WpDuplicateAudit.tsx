import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Search, AlertTriangle, ExternalLink, Trash2 } from 'lucide-react';
import {
  getWordPressCredentials,
  fetchAllDlpDocuments,
  normalizeStandardNumber,
  clearDlpDocumentsCache,
} from '@/utils/wordpressUtils';

interface LogEntry {
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface DuplicateGroup {
  normalizedKey: string;
  standardNumber: string;
  documents: Array<{
    id: number;
    title: string;
    status: string;
    link: string;
    date: string;
  }>;
}

const typeColors: Record<string, string> = {
  info: 'text-muted-foreground',
  success: 'text-green-600',
  warning: 'text-amber-600',
  error: 'text-destructive',
};

const WpDuplicateAudit: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [hasRun, setHasRun] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const credentials = getWordPressCredentials();

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs((prev) => [...prev, { timestamp: new Date(), message, type }]);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const handleStartScan = async () => {
    if (!credentials) return;

    setIsRunning(true);
    setLogs([]);
    setDuplicates([]);
    setHasRun(true);

    addLog(`Connecting to ${credentials.url} as ${credentials.username}...`);

    try {
      addLog('Fetching all DLP documents...');
      const allDocs = await fetchAllDlpDocuments(credentials);
      setTotalDocs(allDocs.length);
      addLog(`Fetched ${allDocs.length} documents`, 'success');

      addLog('Analyzing for duplicates...');

      const groups: Record<string, DuplicateGroup> = {};

      for (const doc of allDocs) {
        const rawTitle = doc.title?.rendered || '(untitled)';
        // Extract standard number: everything before the first ' - '
        const stdPart = rawTitle.split(' - ')[0].trim();
        const normalized = normalizeStandardNumber(stdPart);

        if (!normalized) continue;

        if (!groups[normalized]) {
          groups[normalized] = {
            normalizedKey: normalized,
            standardNumber: stdPart,
            documents: [],
          };
        }
        groups[normalized].documents.push({
          id: doc.id,
          title: rawTitle,
          status: doc.status || 'unknown',
          link: doc.link || '',
          date: doc.date || '',
        });
      }

      const dupes = Object.values(groups).filter((g) => g.documents.length > 1);

      if (dupes.length === 0) {
        addLog('No duplicates found!', 'success');
      } else {
        addLog(`Found ${dupes.length} duplicate groups (${dupes.reduce((a, g) => a + g.documents.length, 0)} documents total)`, 'warning');
      }

      setDuplicates(dupes);
    } catch (err: any) {
      addLog(`Error: ${err.message}`, 'error');
    }

    setIsRunning(false);
  };

  const handleClearCache = () => {
    clearDlpDocumentsCache();
    addLog('DLP document cache cleared', 'info');
  };

  const getWpEditUrl = (id: number) => {
    if (!credentials) return '#';
    const base = credentials.url.replace(/\/+$/, '');
    return `${base}/wp-admin/post.php?post=${id}&action=edit`;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">WordPress Duplicate Audit</h1>
      </div>

      {!credentials ? (
        <Card className="p-6">
          <div className="flex items-center gap-3 text-amber-700">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium">WordPress not configured</p>
              <p className="text-sm text-muted-foreground mt-1">
                Please configure WordPress credentials in{' '}
                <Link to="/settings" className="underline font-medium">Settings</Link>{' '}
                before running the duplicate audit.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <div className="flex gap-3 mb-4">
            <Button onClick={handleStartScan} disabled={isRunning}>
              <Search className="h-4 w-4 mr-2" />
              {isRunning ? 'Scanning...' : 'Start Scan'}
            </Button>
            <Button variant="outline" onClick={handleClearCache} disabled={isRunning}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear WP Cache
            </Button>
          </div>

          {/* Log panel */}
          {logs.length > 0 && (
            <Card className="mb-6 p-3">
              <ScrollArea className="h-[200px] rounded border bg-muted/30 p-3">
                <div ref={scrollRef} className="space-y-0.5 font-mono text-xs">
                  {logs.map((entry, i) => (
                    <div key={i} className={typeColors[entry.type] || 'text-foreground'}>
                      <span className="text-muted-foreground mr-2">[{formatTime(entry.timestamp)}]</span>
                      {entry.message}
                    </div>
                  ))}
                  {isRunning && (
                    <div className="text-muted-foreground animate-pulse">Running...</div>
                  )}
                </div>
              </ScrollArea>
            </Card>
          )}

          {/* Results */}
          {hasRun && !isRunning && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Total documents: <strong className="text-foreground">{totalDocs}</strong></span>
                <span>Duplicate groups: <strong className="text-foreground">{duplicates.length}</strong></span>
              </div>

              {duplicates.length > 0 && (
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60px]">#</TableHead>
                        <TableHead>Standard Number</TableHead>
                        <TableHead>Documents</TableHead>
                        <TableHead className="w-[80px]">Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {duplicates.map((group, idx) => (
                        <TableRow key={group.normalizedKey}>
                          <TableCell className="font-mono text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="font-medium">{group.standardNumber}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {group.documents.map((doc) => (
                                <div key={doc.id} className="flex items-center gap-2 text-sm">
                                  <span className="text-muted-foreground font-mono">#{doc.id}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-xs ${
                                    doc.status === 'publish' ? 'bg-green-100 text-green-700' :
                                    doc.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                                    doc.status === 'private' ? 'bg-blue-100 text-blue-700' :
                                    'bg-amber-100 text-amber-700'
                                  }`}>
                                    {doc.status}
                                  </span>
                                  <span className="truncate max-w-md" title={doc.title}>{doc.title}</span>
                                  <a
                                    href={getWpEditUrl(doc.id)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:text-primary/80 shrink-0"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-mono">{group.documents.length}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}

              {duplicates.length === 0 && (
                <Card className="p-6 text-center text-muted-foreground">
                  No duplicates found — all documents have unique standard numbers.
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default WpDuplicateAudit;
