

## Plan: Limit File Upload to 20 Files at a Time

### What It Does
Enforces a maximum of 20 files per batch across all upload hooks. When a user selects or drops more than 20 files (accounting for files already loaded), excess files are rejected with a toast notification.

### Changes (4 files)

Each file upload hook has a `handleFileSelection` function that processes a `FileList`. Add a check at the top of each:

**1. `src/hooks/useStandardsFileUpload.ts`** (~line 27)
**2. `src/hooks/useFileUpload.ts`** (~line 27)
**3. `src/hooks/useSimpleFileUpload.ts`** (equivalent location)
**4. `src/hooks/useCircularLetterUpload.ts`** (equivalent location)

In each `handleFileSelection`, before creating `newFiles`, add:

```typescript
const MAX_FILES = 20;
const remainingSlots = MAX_FILES - files.length;
if (remainingSlots <= 0) {
  toast.error(`Maximum of ${MAX_FILES} files allowed. Remove some files first.`);
  return;
}
let filesToProcess = Array.from(selectedFiles);
if (filesToProcess.length > remainingSlots) {
  toast.warning(`Only ${remainingSlots} more file(s) allowed. ${filesToProcess.length - remainingSlots} file(s) were skipped.`);
  filesToProcess = filesToProcess.slice(0, remainingSlots);
}
```

Then use `filesToProcess` instead of `Array.from(selectedFiles)` when creating `newFiles`.

### Result
Users can never have more than 20 files loaded at once. If they try to add more, they get a clear message about how many were accepted/skipped.

