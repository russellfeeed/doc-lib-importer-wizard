

## Prefix Standards Media Filenames with Standard Number

### Change

**`src/components/WordPressUploader.tsx`**, lines 137-147 — In the regular documents branch, when `isStandards` is true and the document has a `standardNumber`, prefix the `name` sent to the edge function:

```typescript
// Handle regular documents
const docFile = doc as DocumentFile;
const file = docFile.file;
const fileData = file ? await convertFileToBase64(file) : null;
const uploadName = isStandards && docFile.standardNumber
  ? `${docFile.standardNumber} - ${docFile.name}`
  : docFile.name;
return {
  id: doc.id,
  name: uploadName,
  fileData,
  fileType: docFile.fileType,
};
```

Single change in one file. The edge function already uses `doc.name` for the upload filename, so this flows through automatically.

