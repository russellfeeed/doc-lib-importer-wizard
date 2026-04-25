## Diagnosis

Looking at the latest edge function logs for document **35617**:

```
[check-document-url] /_pda/ probe status=200 ct="application/pdf" cl=3538213
pdf=true html=false magic="%PDF-1.4..." 
```

The proxy is now correctly identifying it as a valid PDF — `result.ok` will return `true`. So the latest fix **is working**.

For **35615**:
```
status=404 ct="text/html; charset=utf-8" pdf=false html=true
```
Genuine 404 → HTML error page. Correctly flagged.

### Why 35617 still appears as an issue in the UI

The audit results currently shown were generated **before** the latest proxy deploy. They are stale. The fix is live, but the UI hasn't re-checked that row.

The Retry button I added previously only renders when `row.issue === "Timeout"`, so the user has no way to re-check this row without re-running the entire audit.

## Fix

### 1. Show the Retry button for ALL issue rows (not just Timeout)

In `src/pages/DocumentUrlAudit.tsx`, remove the `row.issue === "Timeout"` guard on the Retry button. Any flagged row should be re-checkable individually — useful when:
- Edge function logic was updated mid-audit
- A transient WP/network blip caused a false positive
- The user fixed a URL on the WP side and wants to verify

The button keeps its spinner/loading state per row.

### 2. Minor copy tweak

Change the button label/tooltip from "Retry" to "Re-check" so it's clearer it's not just for failures.

## Files to edit

- `src/pages/DocumentUrlAudit.tsx` — drop the conditional around the Retry button; rename to "Re-check".

## Expected outcome

User clicks **Re-check** on the 35617 row → it calls `checkDocumentUrl` again → proxy returns `ok=true` (PDF detected) → row is removed from the issues list and OK count increments.
