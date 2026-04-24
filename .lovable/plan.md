## Document URL Audit — feature plan

A new tool, accessible from the home page, that finds Document Library Pro documents whose file URL is broken (e.g. redirects to a `.htm` page instead of returning a real PDF).

### User flow

1. Click **"Document URL Audit"** card on `/` (home).
2. Page loads: fetch all `doc_categories` from WordPress (with `count` so user can see how many docs are in each).
3. User picks one category from a dropdown.
4. Click **Start Audit**.
5. Page fetches every DLP document in that category, then checks each one's file URL.
6. Live progress log + final results table listing only documents with issues, with WP edit links.

### Result classification per document

| Status | Meaning |
|---|---|
| OK | URL responds 200 and content-type is `application/pdf` (or first bytes are `%PDF-`) |
| Missing URL | DLP document has no attached file / no resolvable link |
| Wrong type | URL responds 200 but content-type is `text/html` (or body starts with `<!DOCTYPE`/`<html`) — typically a "not found" or login page |
| Redirect to .htm | Final URL after redirects ends in `.htm`/`.html` |
| HTTP error | Non-2xx status (404, 403, 500, etc.) — show status code |
| Timeout / network | Fetch failed |

Only documents NOT classified `OK` are shown in the issues table.

### Backend changes (`supabase/functions/wordpress-proxy/index.ts`)

Add three new actions:

1. **`fetch-doc-categories`** — return the full `doc_categories` taxonomy with `id`, `name`, `slug`, `parent`, `count`. (The existing `fetch-taxonomy` action already does this; we'll reuse it directly from the frontend rather than add a new action.)

2. **`fetch-dlp-by-category`** — paginated fetch of `dlp_document` filtered by a single `doc_categories` ID. Returns `id`, `title`, `link`, `status`, `_dlp_attached_file_id` (meta), and the attached media's `source_url`. Two-step:
   - `GET /wp/v2/dlp_document?doc_categories={id}&per_page=100&page=N&_fields=id,title,link,status,meta`
   - For each doc, if `meta._dlp_attached_file_id` exists, batch-fetch `/wp/v2/media?include=id1,id2,...&_fields=id,source_url,mime_type` to resolve the real file URL.
   - Fall back to scraping the file URL from the document's rendered content if meta is not exposed via REST (DLP sometimes hides it).

3. **`check-document-url`** — server-side URL probe (avoids CORS). Input: a URL. Behavior:
   - `fetch(url, { redirect: 'follow' })` with a 10s timeout and `Range: bytes=0-1023` to avoid downloading the full file.
   - Inspect `response.url` (final URL after redirects), `response.status`, `Content-Type` header, and the first ~8 bytes of the body for the `%PDF-` magic number.
   - Return `{ ok, status, finalUrl, contentType, isPdf, isHtml, redirectedToHtm, error }`.
   - Run on the server because the browser cannot read cross-origin response headers reliably and may be blocked by CORS.

### Frontend changes

**New page**: `src/pages/DocumentUrlAudit.tsx`
- Mirrors the look of `WpDuplicateAudit.tsx` (back button, log panel, results table).
- Top: category `<Select>` populated via existing `fetchWordPressTaxonomies('doc_categories')`.
- Buttons: **Start Audit**, **Stop**, **Export CSV** (issues only).
- Progress log with timestamped entries.
- Concurrency: probe URLs in batches of 5 in parallel (via `Promise.all`) with a small delay between batches to avoid hammering the server.
- Issues table columns: # · Doc ID · Title (linked to public link) · File URL (linked) · Issue · HTTP status · Final URL · WP edit link.

**New util**: `src/utils/dlpAuditUtils.ts`
- `fetchDocCategoriesWithCount(creds)` — wraps `fetch-taxonomy`.
- `fetchDlpByCategory(creds, categoryId)` — calls new edge action.
- `checkDocumentUrl(url)` — calls new edge action.

**Routing**: add `/document-url-audit` to `src/App.tsx` (gated by `ProtectedRoute` like other admin tools).

**Home page**: add a new card on `src/pages/Index.tsx` (next to the Duplicate Audit card) titled "Document URL Audit", linking to `/document-url-audit`.

### Notes & constraints

- Uses existing global WordPress credentials from `wordpress_settings` (already hydrated to `localStorage` by `AuthContext`).
- No new database tables or migrations needed.
- No new secrets needed.
- Audit is read-only — never modifies WordPress data.
- Large categories (hundreds of docs) may take a minute or two; the live log keeps the user informed.

### Out of scope (for this iteration)

- No bulk "fix" / re-link action — just identify issues. (Can be a follow-up that pipes selected broken docs into the existing upload-and-replace flow.)
- No persistence of audit results — re-run when needed.
