

## Upload to Media Library & Update Document Library

### What it does
Adds a button (visible when a WordPress duplicate match exists) that:
1. Uploads the local file to the WordPress Media Library
2. Takes the returned media URL and derives the correct File URL / Direct URL
3. Updates the matched DLP document (by ID) with the new file URL plus current local metadata (title, excerpt, categories, tags)

### Technical approach

**1. New `upload-and-update-dlp` action in `supabase/functions/wordpress-proxy/index.ts`**

Since `wordpress-proxy` already has the cookie-based auth fallback (`wpFetch`), and the `wordpress-upload` function does not, the new action lives here. It needs a `wpFetchFormData` variant of `wpFetch` that sends `multipart/form-data` instead of JSON (for the media upload step). Steps inside the handler:

- Receive: `{ documentId, fileData (base64), fileName, fileType, title, excerpt, categories, tags }`
- **Step A**: Upload file to `/wp-json/wp/v2/media` using FormData (with cookie-auth fallback)
- **Step B**: Get `source_url` from the response — derive the `_pda` protected path variant
- **Step C**: Resolve category/tag names to term IDs via `/wp-json/wp/v2/doc_categories?search=X` and `/wp-json/wp/v2/doc_tags?search=X`
- **Step D**: PUT to `/wp-json/wp/v2/dlp_document/{documentId}` with `{ title, excerpt, doc_categories: [ids], doc_tags: [ids], _file_url: derivedUrl }` — the exact meta key for the file URL will need to match what Barn2 DLP expects (likely `_dlp_document_file_url` or similar custom field)

**2. New client utility in `src/utils/wordpressUtils.ts`**

- `uploadAndUpdateDlpDocument(document: DocumentFile)`: reads the File object as base64, calls the edge function, returns success/error status
- Handles the base64 conversion client-side before sending

**3. Button in `src/components/document/editor/WpComparisonPanel.tsx`**

- Add an "Upload & Update in WordPress" button at the bottom of the comparison panel
- Shows a loading spinner during the operation
- On success: toast notification with the new URL; updates `fileUrl` and `directUrl` on the document via `onEdit`
- On error: toast with error message

**4. Prop threading**

- `WpComparisonPanel` needs the `document` object and `onEdit` callback (currently only receives `rows`)
- `DocumentMetadata` already has both — pass them down

### Files to modify
- `supabase/functions/wordpress-proxy/index.ts` — add `wpFetchFormData` helper + `upload-and-update-dlp` action (~80 lines)
- `src/utils/wordpressUtils.ts` — add `uploadAndUpdateDlpDocument` function
- `src/components/document/editor/WpComparisonPanel.tsx` — add button + state, accept new props
- `src/components/document/editor/DocumentMetadata.tsx` — pass document + onEdit to WpComparisonPanel

### Key detail: File URL transformation
The media upload returns a URL like `https://domain/wp-content/uploads/2026/03/file.pdf`. For standards, this needs to become the `_pda` protected variant: `/wp-content/uploads/_pda/2026/03/file.pdf` (relative for File URL) and full absolute for Direct URL. The edge function will derive this from the `source_url` returned by WordPress.

