

## Fix: Ensure PDF Extension on Standards Upload Filenames

### Problem
When standards documents are uploaded to WordPress, `docFile.name` is the document title (not the original filename), so it often lacks a `.pdf` extension. Combined with the standard number prefix (`BS EN 50131-1:2006 - Some Title`), the edge function's extension detection can fail, causing WordPress to misidentify the file's MIME type (e.g., as HTML instead of PDF).

### Root Cause
- `docFile.name` comes from AI-extracted or user-edited document titles — no file extension
- The edge function's `getFileExtension` checks the last `.` segment, finds no valid extension, and falls back to the `fileType` display string mapping — which works but is fragile
- The original filename with its `.pdf` extension is available via `docFile.file?.name` but is not used

### Fix

**`src/components/WordPressUploader.tsx`** — When constructing `uploadName` for standards documents, ensure it ends with the original file's extension:

```typescript
const docFile = doc as DocumentFile;
const file = docFile.file;
const fileData = file ? await convertFileToBase64(file) : null;

// Get original file extension
const originalExt = file?.name?.split('.').pop()?.toLowerCase() || 'pdf';

let uploadName = isStandards && docFile.standardNumber
  ? `${docFile.standardNumber} - ${docFile.name}`
  : docFile.name;

// Ensure filename has proper extension
if (!uploadName.toLowerCase().endsWith(`.${originalExt}`)) {
  uploadName = `${uploadName}.${originalExt}`;
}

return {
  id: doc.id,
  name: uploadName,
  fileData,
  fileType: docFile.fileType,
};
```

This is a single change in one file. The edge function already has extension/MIME handling as a safety net, but this ensures the correct extension is present from the start.

