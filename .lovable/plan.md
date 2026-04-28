## Goal

Extend the Document URL Audit so that when a PDF is successfully fetched, we also inspect its contents for an "expired" notice (e.g., "has now expired. Please log on the NSI member area..."). If detected, flag the document as expired so a human can update it.

## Approach

The current check (`check-document-url` action in `supabase/functions/wordpress-proxy/index.ts`) only reads the first ~1KB of the response and validates the `%PDF-` magic bytes. We'll extend it to:

1. Read the **full PDF body** (capped at a safe size, e.g. 5 MB, to prevent runaway downloads).
2. Extract readable text from the PDF.
3. Match against a list of known expiry phrases.
4. Return a new `expiredNotice` flag plus the matched phrase.

For text extraction, we'll use a lightweight approach native to Deno (no extra deps):
- Decompress any FlateDecode streams found in the PDF using Deno's built-in `DecompressionStream("deflate")`.
- Concatenate decompressed stream contents and the raw PDF bytes (as latin-1 text).
- Run a case-insensitive regex over the combined text for the configured phrases.

This catches both:
- PDFs with uncompressed text streams (phrase appears directly in raw bytes).
- PDFs with FlateDecode-compressed text (most common case).

It will NOT catch image-only/scanned PDFs — that would require OCR, which is out of scope. We'll log a note when we couldn't extract any text from a PDF so the user is aware.

### Phrases to detect (initial list)

- `has now expired`
- `Please log on the NSI member area`
- `obtain the latest version`

Match if **any** phrase appears. Easy to extend later.

## Changes

### 1. `supabase/functions/wordpress-proxy/index.ts`
- Add helper `extractPdfText(bytes: Uint8Array): Promise<string>` that:
  - Walks the PDF byte stream looking for `stream` ... `endstream` blocks.
  - For each block, attempts `DecompressionStream("deflate")`; if it fails, uses raw bytes.
  - Returns concatenated latin-1 decoded text plus the raw bytes as fallback text.
- Add `EXPIRY_PHRASES` constant array.
- In `check-document-url`, after we've read the response body:
  - If `result.isPdf` and body size <= 5 MB, run `extractPdfText` and test phrases.
  - Set `result.expiredNotice = true` and `result.expiredMatch = "<phrase>"` when matched.
  - When matched, set `result.ok = false` so it shows up as an issue.
- Log the detection for debugging.

### 2. `src/utils/dlpAuditUtils.ts`
- Add `expiredNotice?: boolean` and `expiredMatch?: string` to `UrlCheckResult`.
- Update `classifyIssue`:
  - If `r.expiredNotice` → `{ label: "PDF expired — needs update" + (match ? \` (\${match})\` : ""), severity: "error" }`. This branch runs **before** the `r.ok` branch so an otherwise-valid PDF is still flagged.

### 3. `src/pages/DocumentUrlAudit.tsx`
- No structural changes required — the new issue type flows through existing rendering.
- Optional: in the Fix modal, when `expiredNotice` is true, show a hint like "This PDF loads but contains an expiry notice — replace with a fresh copy from WP media library." (small UX win, low effort).

### 4. Deploy `wordpress-proxy` edge function after edits.

## Edge cases & safeguards

- **Large PDFs**: cap inspection at 5 MB; skip text scan beyond that and log a warning. Most NSI standard PDFs are well under this.
- **Encrypted PDFs**: decompression will yield gibberish; phrase won't match → treated as OK (no false positives).
- **Performance**: text scan runs only on successful PDF responses, adds a few ms per doc. Concurrency stays at 2.
- **False positives**: phrases are specific enough ("NSI member area") that legitimate PDFs are unlikely to trigger. List is centralized for easy tuning.

## Out of scope

- OCR for image-only PDFs.
- Configurable phrase list in the UI (can be added later if needed).
