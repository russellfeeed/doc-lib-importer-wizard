

## Fix: Align CSV File URL with WordPress Upload Filename

### Problem
The CSV `File URL` for standards documents does not match the actual filename uploaded to WordPress Media Library. They are constructed differently:

- **CSV** uses the original filename (`docFile.file?.name`), replaces spaces with hyphens, no standard number prefix
- **WordPress upload** prefixes with standard number (`BS EN 50131-1 - Title.pdf`), replaces em/en dashes, ensures extension — then WordPress itself sanitizes the filename further (lowercases, replaces spaces with hyphens)

For example:
- CSV generates: `/wp-content/uploads/_pda/2026/03/original-filename.pdf`
- WordPress stores: `/wp-content/uploads/_pda/2026/03/bs-en-50131-1-some-title.pdf`

### Fix

**`src/utils/csvUtils.ts`** — Align the URL filename construction with what WordPress actually does:

1. Build the same `uploadName` as WordPressUploader (prefix with standard number, replace em/en dashes, ensure extension)
2. Apply WordPress's sanitization (lowercase, replace spaces with hyphens, remove special characters like colons)
3. Use this sanitized name in the `_pda` URL path

```text
Current (line ~225):
  fileName = docFile.file?.name || docFile.name
  urlFileName = fileName.replace(/\s+/g, '-')

Proposed:
  1. Start with uploadName = standardNumber + " - " + docFile.name (matching WP uploader)
  2. Replace em/en dashes with hyphens
  3. Ensure .pdf extension
  4. Sanitize for WordPress: lowercase, replace spaces with hyphens, strip invalid chars
  5. Use sanitized name in URL path
```

This is a single change in one file (`csvUtils.ts`), affecting only the standards URL generation block (~lines 223-235).

