

## Fix: Add Visibility to WordPress DLP Document Check

### Problem
When uploading a standards document, the WordPress duplicate check runs silently. If credentials aren't configured, it returns `null` without any indication. Even when it does run, there's no loading indicator or status feedback, so you can't tell if it's searching or if it was skipped entirely.

### Root Cause
Looking at the console logs, the error `"WordPress credentials not found"` appears from the editor's metadata fetching -- but the DLP check in `checkExistingDlpDocument` just silently returns `null` with no log or toast. There is no feedback at any stage.

### Solution
Add clear feedback at every stage of the WordPress check process:

### Changes

#### 1. Add logging and toast feedback in `useStandardsFileUpload.ts`

Around the WordPress check block (lines 94-107):
- Add a toast or log **before** the check starts: "Checking WordPress for existing document..."
- If credentials are missing, show an info toast: "WordPress credentials not configured - skipping duplicate check"
- If the check succeeds and finds a match, keep the existing warning toast
- If the check succeeds with no match, log it: "No existing WordPress document found for {standardNumber}"
- If the check fails, log the error (already done)

#### 2. Add logging in `checkExistingDlpDocument` (`src/utils/wordpressUtils.ts`)

- Add `console.log` when credentials are missing (line 183)
- Add `console.log` when fetching starts, showing the standard number being searched
- Add `console.log` showing the number of documents fetched and the normalized search term
- Add `console.log` when a match is found or not found

#### 3. Update the FileList UI to show search status

In the `FileList` component or `DocumentsTableView`, show a "Checking WP..." spinner/text while the WordPress check is in progress. This requires:
- Adding a `wpCheckStatus` field to the file object (or reusing `aiProcessing` stages) in `useStandardsFileUpload.ts` to track: `'pending' | 'checking' | 'done' | 'skipped'`
- Displaying this status in the file list so the user can see the check is happening

### Technical Details

The main code change is in `useStandardsFileUpload.ts` around lines 94-107:

```text
// Before the check
toast.info(`Checking WordPress for existing document: ${standardNumber}...`);
console.log(`Checking WordPress for existing DLP document: ${standardNumber}`);

try {
  const existing = await checkExistingDlpDocument(standardNumber);
  if (existing) {
    updatedFile = { ...updatedFile, wpExisting: existing };
    toast.warning(`Standard ${standardNumber} already exists in WordPress`);
  } else {
    console.log(`No existing WordPress document found for: ${standardNumber}`);
  }
} catch (wpError) {
  console.error('WordPress check failed (non-blocking):', wpError);
}
```

And in `checkExistingDlpDocument`:

```text
const credentials = getWordPressCredentials();
if (!credentials) {
  console.log('WordPress credentials not configured - skipping DLP duplicate check');
  return null;
}
if (!standardNumber) {
  console.log('No standard number provided - skipping DLP duplicate check');
  return null;
}

console.log(`Fetching all DLP documents to check for: "${standardNumber}"`);
const allDocs = await fetchAllDlpDocuments(credentials);
const normalizedSearch = normalizeStandardNumber(standardNumber);
console.log(`Searching ${allDocs.length} documents, normalized search: "${normalizedSearch}"`);
```

This will make it immediately obvious whether the check is running, being skipped (and why), or finding/not finding matches.
