

## Check WordPress for Existing DLP Documents During Standards Upload

### Problem
When uploading standards documents, there's no way to know if a document already exists in the WordPress Document Library. This can lead to duplicates.

### Solution
After AI processing extracts the `standardNumber`, query the WordPress REST API via the existing `wordpress-proxy` edge function to search for existing `dlp_document` posts matching that standard number. Display the result (exists/new) in the UI so the user can decide whether to proceed.

### Changes Required

#### 1. Add `search-dlp-documents` action to `wordpress-proxy` edge function (`supabase/functions/wordpress-proxy/index.ts`)

Add a new action handler that searches `dlp_document` posts by title (which contains the standard number):

- Accepts: `siteUrl`, `username`, `password`, `action: 'search-dlp-documents'`, `searchTerm` (the standard number)
- Calls: `GET {baseUrl}/wp-json/wp/v2/dlp_document?search={searchTerm}&per_page=10&_fields=id,title,status,link,date`
- Returns: Array of matching documents with id, title, status, link, date

#### 2. Add duplicate check utility function (`src/utils/wordpressUtils.ts`)

Add a new function `checkExistingDlpDocument`:
- Takes `standardNumber` string
- Gets WP credentials from localStorage via `getWordPressCredentials()`
- If no credentials, returns `null` (skip check silently)
- Calls `wordpress-proxy` with `action: 'search-dlp-documents'`
- Returns matching documents array or `null`

#### 3. Update `DocumentFile` type (`src/types/document.ts`)

Add an optional field:
```text
wpExisting?: {
  id: number;
  title: string;
  status: string;
  link: string;
  date: string;
} | null;
```

#### 4. Update `useStandardsFileUpload.ts` to check WordPress after AI processing

After AI processing completes and `standardNumber` is extracted (around line 77-91):
- Call `checkExistingDlpDocument(standardNumber)` 
- If a match is found, set `wpExisting` on the file object
- Show a toast warning: "Standard {number} already exists in WordPress"

#### 5. Update `DocumentsTableView.tsx` to show existing document status

In the Standards table view, add a visual indicator column or badge:
- Green "New" badge if no existing document found
- Orange/yellow "Exists in WP" badge with link if a matching document was found
- Grey "Not checked" if WP credentials aren't configured

#### 6. Update `SingleDocumentEditor.tsx` to show existing document info

In the single document editor view for Standards:
- Show a banner/alert if `wpExisting` is set: "This standard already exists in WordPress as [title] (status: draft/published)" with a link to view it
- This helps users decide whether to update or skip

### Technical Notes

- The check happens **after** AI processing, since we need the extracted `standardNumber` to search
- If WordPress credentials aren't configured, the check is silently skipped (no errors)
- The search uses the WP REST API search parameter which matches against post titles
- The existing `wordpress-proxy` edge function pattern is reused, keeping auth proxied server-side
- The check is non-blocking -- if it fails, processing continues normally

