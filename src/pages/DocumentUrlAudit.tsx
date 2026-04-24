import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Search, AlertTriangle, ExternalLink, Square, Download } from "lucide-react";
import { getWordPressCredentials } from "@/utils/wordpressUtils";
import {
  fetchDocCategories,
  fetchDlpByCategory,
  checkDocumentUrl,
  classifyIssue,
  type DocCategory,
  type DlpDocSummary,
  type UrlCheckResult,
} from "@/utils/dlpAuditUtils";

interface LogEntry {
  timestamp: Date;
  message: string;
  type: "info" | "success" | "warning" | "error" | "detail";
}

interface IssueRow {
  doc: DlpDocSummary;
  result: UrlCheckResult;
  issue: string;
  severity: "ok" | "warn" | "error";
}

const typeColors: Record<string, string> = {
  info: "text-muted-foreground",
  success: "text-green-600",
  warning: "text-amber-600",
  error: "text-destructive",
  detail: "text-muted-foreground/70",
};

const CONCURRENCY = 5;

const DocumentUrlAudit: React.FC = () => {
  const credentials = getWordPressCredentials();

  const [categories, setCategories] = useState<DocCategory[]>([]);
  const [loadingCats, setLoadingCats] = useState(false);
  const [selectedCat, setSelectedCat] = useState<string>("");

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [scanned, setScanned] = useState(0);
  const [totalDocs, setTotalDocs] = useState(0);
  const [okCount, setOkCount] = useState(0);
  const [hasRun, setHasRun] = useState(false);

  const stopRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string, type: LogEntry["type"] = "info") =>
    setLogs((prev) => [...prev, { timestamp: new Date(), message, type }]);

  useEffect(() => {
    if (!credentials) return;
    let cancelled = false;
    (async () => {
      setLoadingCats(true);
      try {
        const cats = await fetchDocCategories();
        if (cancelled) return;
        // Sort: by count desc then name
        cats.sort((a, b) => (b.count || 0) - (a.count || 0) || a.name.localeCompare(b.name));
        setCategories(cats);
      } catch (err: any) {
        if (!cancelled) addLog(`Failed to load categories: ${err.message}`, "error");
      } finally {
        if (!cancelled) setLoadingCats(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const selectedCategory = useMemo(
    () => categories.find((c) => String(c.id) === selectedCat),
    [categories, selectedCat]
  );

  const handleStart = async () => {
    if (!credentials || !selectedCategory) return;

    stopRef.current = false;
    setIsRunning(true);
    setHasRun(true);
    setLogs([]);
    setIssues([]);
    setScanned(0);
    setOkCount(0);
    setTotalDocs(0);

    addLog(`Connecting to ${credentials.url} as ${credentials.username}…`);
    addLog(`Category: "${selectedCategory.name}" (id ${selectedCategory.id}, count ${selectedCategory.count})`);

    let docs: DlpDocSummary[] = [];
    try {
      addLog("Fetching documents in category…");
      docs = await fetchDlpByCategory(selectedCategory.id);
      setTotalDocs(docs.length);
      addLog(`Fetched ${docs.length} documents`, "success");
    } catch (err: any) {
      addLog(`Error fetching documents: ${err.message}`, "error");
      setIsRunning(false);
      return;
    }

    if (docs.length === 0) {
      addLog("No documents to check.", "warning");
      setIsRunning(false);
      return;
    }

    addLog(`Probing URLs (${CONCURRENCY} in parallel)…`);

    const localIssues: IssueRow[] = [];
    let localOk = 0;
    let localScanned = 0;

    for (let i = 0; i < docs.length; i += CONCURRENCY) {
      if (stopRef.current) {
        addLog("Stopped by user.", "warning");
        break;
      }

      const batch = docs.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        batch.map(async (doc) => {
          if (!doc.fileUrl) {
            const r: UrlCheckResult = {
              ok: false,
              status: 0,
              finalUrl: "",
              contentType: "",
              contentLength: 0,
              isPdf: false,
              isHtml: false,
              redirectedToHtm: false,
              error: "no-url",
            };
            return { doc, result: r };
          }
          const result = await checkDocumentUrl(doc.fileUrl);
          return { doc, result };
        })
      );

      for (const { doc, result } of results) {
        localScanned += 1;
        const cls = classifyIssue(result, !!doc.fileUrl);
        if (cls.severity === "ok") {
          localOk += 1;
          addLog(`✅ #${doc.id} ${doc.title}`, "detail");
        } else {
          localIssues.push({ doc, result, issue: cls.label, severity: cls.severity });
          addLog(`❌ #${doc.id} ${doc.title} — ${cls.label}`, cls.severity === "warn" ? "warning" : "error");
        }
      }

      setScanned(localScanned);
      setOkCount(localOk);
      setIssues([...localIssues]);
    }

    addLog(
      `Done. Scanned ${localScanned}/${docs.length} · OK: ${localOk} · Issues: ${localIssues.length}`,
      localIssues.length === 0 ? "success" : "warning"
    );
    setIsRunning(false);
  };

  const handleStop = () => {
    stopRef.current = true;
  };

  const handleExportCsv = () => {
    const rows = [
      ["Doc ID", "Title", "Issue", "HTTP Status", "Content-Type", "File URL", "Final URL", "WP Edit"],
      ...issues.map((i) => [
        String(i.doc.id),
        i.doc.title.replace(/<[^>]+>/g, ""),
        i.issue,
        String(i.result.status),
        i.result.contentType,
        i.doc.fileUrl,
        i.result.finalUrl,
        getWpEditUrl(i.doc.id),
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${(c || "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dlp-url-audit-${selectedCategory?.name || "category"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getWpEditUrl = (id: number) => {
    if (!credentials) return "#";
    const base = credentials.url.replace(/\/+$/, "");
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
        <h1 className="text-2xl font-bold">Document URL Audit</h1>
      </div>

      {!credentials ? (
        <Card className="p-6">
          <div className="flex items-center gap-3 text-amber-700">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium">WordPress not configured</p>
              <p className="text-sm text-muted-foreground mt-1">
                Please configure WordPress credentials in{" "}
                <Link to="/settings" className="underline font-medium">Settings</Link>{" "}
                before running this audit.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <Card className="p-4 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium block mb-1">Document Library Category</label>
                <Select
                  value={selectedCat}
                  onValueChange={setSelectedCat}
                  disabled={loadingCats || isRunning}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={loadingCats ? "Loading categories…" : "Select a category"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name} ({c.count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleStart} disabled={!selectedCat || isRunning}>
                  <Search className="h-4 w-4 mr-2" />
                  {isRunning ? "Auditing…" : "Start Audit"}
                </Button>
                {isRunning && (
                  <Button variant="outline" onClick={handleStop}>
                    <Square className="h-4 w-4 mr-2" />
                    Stop
                  </Button>
                )}
                {!isRunning && hasRun && issues.length > 0 && (
                  <Button variant="outline" onClick={handleExportCsv}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                )}
              </div>
            </div>

            {hasRun && (
              <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
                <span>Total: <strong className="text-foreground">{totalDocs}</strong></span>
                <span>Scanned: <strong className="text-foreground">{scanned}</strong></span>
                <span>OK: <strong className="text-green-600">{okCount}</strong></span>
                <span>Issues: <strong className="text-destructive">{issues.length}</strong></span>
              </div>
            )}
          </Card>

          {logs.length > 0 && (
            <Card className="mb-6 p-3">
              <ScrollArea className="h-[220px] rounded border bg-muted/30 p-3">
                <div ref={scrollRef} className="space-y-0.5 font-mono text-xs">
                  {logs.map((entry, i) => (
                    <div key={i} className={typeColors[entry.type] || "text-foreground"}>
                      <span className="text-muted-foreground mr-2">[{formatTime(entry.timestamp)}]</span>
                      {entry.message}
                    </div>
                  ))}
                  {isRunning && (
                    <div className="text-muted-foreground animate-pulse">Running…</div>
                  )}
                </div>
              </ScrollArea>
            </Card>
          )}

          {hasRun && issues.length > 0 && (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead className="w-[80px]">Doc ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Issue</TableHead>
                    <TableHead>File URL</TableHead>
                    <TableHead className="w-[60px]">Edit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issues.map((row, idx) => (
                    <TableRow key={row.doc.id}>
                      <TableCell className="font-mono text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-mono"><a href={getWpEditUrl(row.doc.id)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{row.doc.id}</a></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className="truncate max-w-xs"
                            title={row.doc.title}
                            dangerouslySetInnerHTML={{ __html: row.doc.title }}
                          />
                          {row.doc.link && (
                            <a
                              href={row.doc.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:text-primary/80 shrink-0"
                              title="Open document page"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-1.5 py-0.5 rounded text-xs ${
                            row.severity === "error"
                              ? "bg-destructive/15 text-destructive"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {row.issue}
                        </span>
                        {row.result.finalUrl && row.result.finalUrl !== row.doc.fileUrl && (
                          <div className="text-xs text-muted-foreground mt-1 truncate max-w-md" title={row.result.finalUrl}>
                            → {row.result.finalUrl}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.doc.fileUrl ? (
                          <a
                            href={row.doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:text-primary/80 truncate max-w-xs block"
                            title={row.doc.fileUrl}
                          >
                            {row.doc.fileUrl}
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">none</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <a
                          href={getWpEditUrl(row.doc.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {hasRun && !isRunning && issues.length === 0 && scanned > 0 && (
            <Card className="p-6 text-center text-green-700">
              All {scanned} documents resolved to a valid PDF. No issues found.
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default DocumentUrlAudit;