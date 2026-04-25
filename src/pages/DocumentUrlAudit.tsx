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
import { ArrowLeft, Search, AlertTriangle, ExternalLink, Square, Download, Code2, Copy, X, RotateCcw, ClipboardCopy, Wrench, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getWordPressCredentials } from "@/utils/wordpressUtils";
import {
  fetchDocCategories,
  fetchDlpByCategory,
  checkDocumentUrl,
  classifyIssue,
  fetchDlpRaw,
  searchWordPressMedia,
  type DocCategory,
  type DlpDocSummary,
  type UrlCheckResult,
  type MediaCandidate,
} from "@/utils/dlpAuditUtils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

interface LogEntry {
  timestamp: Date;
  message: string;
  type: "info" | "success" | "warning" | "error" | "detail";
}

interface IssueRow {
  doc: DlpDocSummary;
  result: UrlCheckResult;
  issue: string;
  severity: "ok" | "warn" | "error" | "protected";
}

const typeColors: Record<string, string> = {
  info: "text-muted-foreground",
  success: "text-green-600",
  warning: "text-amber-600",
  error: "text-destructive",
  detail: "text-muted-foreground/70",
};

// Concurrency is intentionally low: WordPress + the PDA plugin start returning
// transient 404/HTML responses for valid files when more than ~2 audit probes
// hit the host at once (each probe also POSTs to wp-login.php). The edge function
// has its own auto-retry-with-backoff for those, but keeping the burst small at
// the source dramatically reduces false positives.
const CONCURRENCY = 2;
const INTER_BATCH_DELAY_MS = 250;

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

  const [inspectOpen, setInspectOpen] = useState(false);
  const [inspectDocId, setInspectDocId] = useState<number | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectError, setInspectError] = useState<string>("");
  const [inspectJson, setInspectJson] = useState<any>(null);
  const [inspectSearch, setInspectSearch] = useState("");

  const handleInspect = async (docId: number) => {
    setInspectOpen(true);
    setInspectDocId(docId);
    setInspectLoading(true);
    setInspectError("");
    setInspectJson(null);
    setInspectSearch("");
    try {
      const data = await fetchDlpRaw(docId);
      setInspectJson(data);
    } catch (err: any) {
      setInspectError(err.message || "Failed to fetch raw JSON");
    } finally {
      setInspectLoading(false);
    }
  };

  const handleCopyJson = async () => {
    if (!inspectJson) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(inspectJson, null, 2));
      toast.success("Copied raw JSON to clipboard");
    } catch {
      toast.error("Copy failed");
    }
  };

  const inspectJsonText = useMemo(
    () => (inspectJson ? JSON.stringify(inspectJson, null, 2) : ""),
    [inspectJson]
  );

  const { highlighted, matchCount } = useMemo(() => {
    if (!inspectJsonText) return { highlighted: null as React.ReactNode, matchCount: 0 };
    const q = inspectSearch.trim();
    if (!q) return { highlighted: inspectJsonText, matchCount: 0 };
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped, "gi");
    const parts: React.ReactNode[] = [];
    let last = 0;
    let count = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(inspectJsonText)) !== null) {
      if (m.index > last) parts.push(inspectJsonText.slice(last, m.index));
      parts.push(
        <mark key={`m${count}`} className="bg-yellow-300 text-foreground rounded-sm px-0.5">
          {m[0]}
        </mark>
      );
      last = m.index + m[0].length;
      count += 1;
      if (m[0].length === 0) re.lastIndex += 1;
    }
    if (last < inspectJsonText.length) parts.push(inspectJsonText.slice(last));
    return { highlighted: parts, matchCount: count };
  }, [inspectJsonText, inspectSearch]);


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
          const logType =
            cls.severity === "warn" || cls.severity === "protected" ? "warning" : "error";
          const icon = cls.severity === "protected" ? "🔒" : "❌";
          addLog(`${icon} #${doc.id} ${doc.title} — ${cls.label}`, logType);
        }
      }

      setScanned(localScanned);
      setOkCount(localOk);
      setIssues([...localIssues]);

      // Brief pause between batches so we don't sustain a burst against wp-login.php.
      if (i + CONCURRENCY < docs.length) {
        await new Promise((r) => setTimeout(r, INTER_BATCH_DELAY_MS));
      }
    }

    addLog(
      `Done. Scanned ${localScanned}/${docs.length} · OK: ${localOk} · Issues: ${localIssues.length}`,
      localIssues.length === 0 ? "success" : "warning"
    );
    setIsRunning(false);
  };

  const [retryingId, setRetryingId] = useState<number | null>(null);

  // ---- "Fix" suggestion modal ----
  const [fixOpen, setFixOpen] = useState(false);
  const [fixDoc, setFixDoc] = useState<DlpDocSummary | null>(null);
  const [fixQuery, setFixQuery] = useState("");
  const [fixLoading, setFixLoading] = useState(false);
  const [fixError, setFixError] = useState<string>("");
  const [fixResults, setFixResults] = useState<MediaCandidate[]>([]);

  // Derive a search-friendly query from a document title.
  // Examples:
  //   "BS 1234 - Specification for X"  -> "BS 1234"
  //   "PD 5304:2019+A1"                -> "PD 5304:2019+A1"
  const deriveQueryFromTitle = (rawTitle: string): string => {
    const plain = (rawTitle || "").replace(/<[^>]+>/g, "").trim();
    if (!plain) return "";
    // Try splitting on " - " or " – " (en dash)
    const split = plain.split(/\s[-–—]\s/);
    const head = (split[0] || "").trim();
    if (head && head.length >= 3 && head.length <= 40) return head;
    return plain.length > 60 ? plain.slice(0, 60) : plain;
  };

  const runMediaSearch = async (q: string) => {
    const term = q.trim();
    if (!term) return;
    setFixLoading(true);
    setFixError("");
    setFixResults([]);
    try {
      const results = await searchWordPressMedia(term, "application/pdf");
      setFixResults(results);
    } catch (e: any) {
      setFixError(e?.message || "Search failed");
    } finally {
      setFixLoading(false);
    }
  };

  const handleOpenFix = (doc: DlpDocSummary) => {
    const q = deriveQueryFromTitle(doc.title);
    setFixDoc(doc);
    setFixQuery(q);
    setFixOpen(true);
    setFixResults([]);
    setFixError("");
    if (q) {
      void runMediaSearch(q);
    }
  };

  const handleCopyMediaUrl = async (url: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      toast.success("File URL copied");
    } catch (e: any) {
      toast.error("Copy failed: " + (e?.message || "clipboard unavailable"));
    }
  };

  const handleRetryRow = async (docId: number) => {
    const row = issues.find((i) => i.doc.id === docId);
    if (!row || !row.doc.fileUrl) return;
    setRetryingId(docId);
    try {
      const result = await checkDocumentUrl(row.doc.fileUrl);
      const cls = classifyIssue(result, !!row.doc.fileUrl);
      if (cls.severity === "ok") {
        setIssues((prev) => prev.filter((i) => i.doc.id !== docId));
        setOkCount((c) => c + 1);
        addLog(`✅ #${row.doc.id} ${row.doc.title} (retry succeeded)`, "success");
      } else {
        setIssues((prev) =>
          prev.map((i) =>
            i.doc.id === docId
              ? { doc: i.doc, result, issue: cls.label, severity: cls.severity }
              : i
          )
        );
        const logType =
          cls.severity === "warn" || cls.severity === "protected" ? "warning" : "error";
        const icon = cls.severity === "protected" ? "🔒" : "❌";
        addLog(`${icon} #${row.doc.id} ${row.doc.title} — ${cls.label} (retry)`, logType);
      }
    } catch (e: any) {
      addLog(`Retry failed for #${docId}: ${e?.message || "unknown error"}`, "error");
    } finally {
      setRetryingId(null);
    }
  };

  const handleStop = () => {
    stopRef.current = true;
  };

  const handleExportCsv = () => {
    const rows = [
      ["Doc ID", "Title", "Issue", "Resolved From", "HTTP Status", "Content-Type", "File URL", "Final URL", "WP Edit"],
      ...issues.map((i) => [
        String(i.doc.id),
        i.doc.title.replace(/<[^>]+>/g, ""),
        i.issue,
        i.doc.resolvedFrom || "",
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

  const handleCopyTable = async () => {
    if (issues.length === 0) return;

    const escapeHtml = (s: string) =>
      s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    const rows = issues.map((i) => ({
      id: String(i.doc.id),
      title: i.doc.title.replace(/<[^>]+>/g, "").trim(),
      url: i.doc.fileUrl || i.doc.link || "",
      issue: i.issue,
    }));

    // Plain-text fallback: tab-separated, pastes cleanly into Excel/Sheets/plain email.
    const tsv = [
      ["Doc ID", "Title", "URL", "Issue"].join("\t"),
      ...rows.map((r) => [r.id, r.title, r.url, r.issue].join("\t")),
    ].join("\n");

    // Rich HTML: renders as a real table in Outlook, Gmail, Apple Mail, Word, etc.
    const html =
      `<table border="1" cellspacing="0" cellpadding="6" ` +
      `style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px;">` +
      `<thead><tr style="background:#f3f4f6;">` +
      `<th align="left">Doc ID</th>` +
      `<th align="left">Title</th>` +
      `<th align="left">URL</th>` +
      `<th align="left">Issue</th>` +
      `</tr></thead><tbody>` +
      rows
        .map(
          (r) =>
            `<tr>` +
            `<td>${escapeHtml(r.id)}</td>` +
            `<td>${escapeHtml(r.title)}</td>` +
            `<td><a href="${escapeHtml(r.url)}">${escapeHtml(r.url)}</a></td>` +
            `<td>${escapeHtml(r.issue)}</td>` +
            `</tr>`,
        )
        .join("") +
      `</tbody></table>`;

    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([tsv], { type: "text/plain" }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(tsv);
      }
      toast.success(`Copied ${rows.length} row${rows.length === 1 ? "" : "s"} to clipboard`);
    } catch (e: any) {
      // Final fallback: legacy execCommand path for older browsers / blocked Clipboard API.
      try {
        const ta = document.createElement("textarea");
        ta.value = tsv;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        toast.success(`Copied ${rows.length} row${rows.length === 1 ? "" : "s"} (plain text)`);
      } catch {
        toast.error("Copy failed: " + (e?.message || "clipboard unavailable"));
      }
    }
  };

  const getWpEditUrl = (id: number) => {
    if (!credentials) return "#";
    const base = credentials.url.replace(/\/+$/, "");
    return `${base}/wp-admin/post.php?post=${id}&action=edit`;
  };

  const resolvedFromBadge = (rf?: string) => {
    if (!rf) return <span className="text-xs text-muted-foreground italic">unresolved</span>;
    const tone =
      rf === "attached_media"
        ? "bg-green-100 text-green-700"
        : rf.startsWith("meta:")
        ? "bg-blue-100 text-blue-700"
        : rf === "content_scrape"
        ? "bg-amber-100 text-amber-700"
        : rf === "public_page_scrape"
        ? "bg-orange-100 text-orange-700"
        : "bg-muted text-muted-foreground";
    return (
      <span className={`px-1.5 py-0.5 rounded text-xs font-mono ${tone}`} title={rf}>
        {rf}
      </span>
    );
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
                  <>
                    <Button
                      variant="outline"
                      onClick={handleCopyTable}
                      title="Copy issues as a table (paste into email or spreadsheet)"
                    >
                      <ClipboardCopy className="h-4 w-4 mr-2" />
                      Copy Table
                    </Button>
                    <Button variant="outline" onClick={handleExportCsv}>
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                  </>
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
                    <TableHead className="w-[160px]">Resolved From</TableHead>
                    <TableHead>File URL</TableHead>
                    <TableHead className="w-[60px]">Inspect</TableHead>
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
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-xs ${
                              row.severity === "error"
                                ? "bg-destructive/15 text-destructive"
                                : row.severity === "protected"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                            title={
                              row.severity === "protected"
                                ? "PDA-protected file. WordPress login attempt failed — file may still be valid for logged-in users."
                                : undefined
                            }
                          >
                            {row.issue}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs gap-1"
                            disabled={retryingId === row.doc.id}
                            onClick={() => handleRetryRow(row.doc.id)}
                            title="Re-check this URL"
                          >
                            <RotateCcw
                              className={`h-3 w-3 ${retryingId === row.doc.id ? "animate-spin" : ""}`}
                            />
                            {retryingId === row.doc.id ? "Checking…" : "Re-check"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs gap-1"
                            onClick={() => handleOpenFix(row.doc)}
                            title="Suggest a matching file from the WordPress Media Library"
                          >
                            <Wrench className="h-3 w-3" />
                            Fix
                          </Button>
                        </div>
                        {row.result.finalUrl && row.result.finalUrl !== row.doc.fileUrl && (
                          <div className="text-xs text-muted-foreground mt-1 truncate max-w-md" title={row.result.finalUrl}>
                            → {row.result.finalUrl}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{resolvedFromBadge(row.doc.resolvedFrom)}</TableCell>
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
                        <button
                          type="button"
                          onClick={() => handleInspect(row.doc.id)}
                          className="text-primary hover:text-primary/80"
                          title="View raw dlp_document JSON"
                        >
                          <Code2 className="h-4 w-4" />
                        </button>
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

          <Dialog open={inspectOpen} onOpenChange={setInspectOpen}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Code2 className="h-5 w-5" />
                  Raw dlp_document JSON
                  {inspectDocId !== null && (
                    <span className="font-mono text-sm text-muted-foreground">#{inspectDocId}</span>
                  )}
                </DialogTitle>
                <DialogDescription>
                  Full WordPress REST response (context=edit) including all <code>meta</code> keys.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2 min-h-0">
                {inspectLoading && (
                  <div className="text-sm text-muted-foreground animate-pulse">Loading…</div>
                )}
                {inspectError && (
                  <div className="text-sm text-destructive">{inspectError}</div>
                )}
                {inspectJson && (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <Input
                          value={inspectSearch}
                          onChange={(e) => setInspectSearch(e.target.value)}
                          placeholder="Search JSON (e.g. _dlp_, .pdf, attached)…"
                          className="pl-8 pr-8 h-9 font-mono text-xs"
                        />
                        {inspectSearch && (
                          <button
                            type="button"
                            onClick={() => setInspectSearch("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            title="Clear"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap min-w-[70px] text-right">
                        {inspectSearch ? `${matchCount} match${matchCount === 1 ? "" : "es"}` : ""}
                      </span>
                      <Button variant="outline" size="sm" onClick={handleCopyJson}>
                        <Copy className="h-3.5 w-3.5 mr-1.5" />
                        Copy JSON
                      </Button>
                    </div>
                    <div className="rounded border bg-muted/30 overflow-auto max-h-[60vh]">
                      <pre className="p-3 font-mono text-xs whitespace-pre-wrap break-all">
{highlighted}
                      </pre>
                    </div>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};

export default DocumentUrlAudit;