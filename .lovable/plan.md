

## Add "Generate All Data" Button for Standards

Add a single button that generates all metadata (Standard Number, Document Title, Name, Categories, Tags, Excerpt) for selected documents in one click.

### Changes

**1. `src/hooks/useStandardsAiGeneration.ts`** — Add new `handleGenerateAllData` function:
- Accepts `selectedIndices?: Set<number>`
- For each selected document with content, sequentially calls:
  1. `extractStandardsDataWithOpenAI` → sets `standardNumber` and `documentTitle`
  2. `generateDocumentSummary` → sets `excerpt`
  3. `generateStandardsCategory` → sets `categories`
  4. `generateDocumentTags` → sets `tags`
  5. Sets `name` from `documentTitle` if extracted
- Includes content truncation logic (same 100K limit as other batch functions)
- Returns the new function in the hook's return object

**2. `src/hooks/useStandardsDocumentEditor.ts`** — Destructure and expose `handleGenerateAllData` from the hook.

**3. `src/components/StandardsDocumentEditor.tsx`** — Pass `handleGenerateAllData` as `onGenerateAllData` prop to `DocumentsTableView`.

**4. `src/components/document/DocumentsTableView.tsx`**:
- Add optional `onGenerateAllData` prop: `(selectedIndices?: Set<number>) => void`
- Add `handleBulkGenerateAllData` handler with `bulkOperationType = 'all'`
- Add a prominent button (shown when documents are selected) labeled "Generate All Data ({count})" with a distinct style (e.g., `variant="default"` instead of `outline`) to distinguish it from individual field buttons

### UI placement
The "Generate All Data" button appears in the bulk actions bar alongside the existing Generate Excerpts / Categories / Tags buttons, but styled more prominently since it's the primary action.

