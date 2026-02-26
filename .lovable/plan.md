

## Add "Check WordPress Duplicate" Button with Live Search Modal

### Overview
Add a button on the SingleDocumentEditor (Edit Information page) that triggers the WordPress duplicate check on-demand and displays a modal showing the entire search process in real-time -- fetching documents, normalizing the standard number, and attempting matches.

### Changes

#### 1. New component: `src/components/document/editor/WpDuplicateCheckModal.tsx`

A dialog modal containing:
- A "log" area (scrollable) that shows timestamped lines as the check progresses
- Steps displayed:
  1. "Checking WordPress credentials..." -> shows site URL or "Not configured"
  2. "Fetching all DLP documents..." -> "Fetched 342 documents" (or "Using cached: 342 documents")
  3. "Standard number: PD CLC/TS 50131-2-9:2016"
  4. "Normalized search term: pdclcts5013129:2016"
  5. "Comparing against documents..." then lists each title being compared with its normalized form, highlighting near-matches
  6. Final result: "MATCH FOUND: ..." (green) or "No match found" (amber)

Implementation:
- Accept `standardNumber` and `isOpen`/`onClose` props
- Use `useState` for an array of log entries (each with text, type: info/success/warning/error, timestamp)
- Run the check step-by-step using a refactored version of the logic from `checkExistingDlpDocument`, but instead of just returning a result, it appends log entries as it goes
- Export a new function `checkExistingDlpDocumentWithLogs` from `wordpressUtils.ts` that accepts a callback `(message: string, type: string) => void` for each step
- Auto-scroll the log area to the bottom as new entries appear

#### 2. Update `src/utils/wordpressUtils.ts` -- add `checkExistingDlpDocumentWithLogs`

New exported function that mirrors `checkExistingDlpDocument` but calls a `logCallback` at every step:
- Credential check
- Fetch start / cache hit
- Document count
- Standard number and normalized form
- Each document comparison (show first 20 individually, then summarize remaining)
- Match result

Returns the same result type as `checkExistingDlpDocument`.

#### 3. Update `src/components/document/editor/DocumentMetadata.tsx`

Add a "Check WP Duplicate" button (with a Search icon) near the top of the metadata panel, visible only when `isStandards` is true. Clicking it opens the `WpDuplicateCheckModal` with the current document's `standardNumber`.

If a match is found, update the document's `wpExisting` field via `onEdit`.

#### 4. Update `SingleDocumentEditor.tsx`

No changes needed -- the button lives inside `DocumentMetadata` which already has access to the document and `onEdit`.

### Technical Details

**Log entry type:**
```text
interface LogEntry {
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'detail';
}
```

**`checkExistingDlpDocumentWithLogs` signature:**
```text
export const checkExistingDlpDocumentWithLogs = async (
  standardNumber: string,
  log: (message: string, type: string) => void
): Promise<{ id, title, status, link, date } | null>
```

**Files to create:**
- `src/components/document/editor/WpDuplicateCheckModal.tsx`

**Files to edit:**
- `src/utils/wordpressUtils.ts` -- add `checkExistingDlpDocumentWithLogs`
- `src/components/document/editor/DocumentMetadata.tsx` -- add button + modal integration

