

## Add Selection-Aware Bulk AI Generation

### Problem
The table view already has checkboxes and selection state, but the bulk "Generate All" handlers in the AI generation hooks iterate over ALL documents regardless of selection. The selection state in `DocumentsTableView` is never passed down to the actual generation logic.

### Approach
Update all `handleGenerateAll*` functions across the three AI generation hooks to accept an optional `selectedIndices: Set<number>` parameter. When provided, only process documents at those indices. Update the props/types to thread this through from the table view.

### Files to change

**1. `src/hooks/document-editor/types.ts`**
- Change signatures of `handleGenerateAllExcerpts`, `handleGenerateAllCategories`, `handleGenerateAllTags`, `handleGenerateAllSchemes` to accept `(selectedIndices?: Set<number>)`.

**2. `src/hooks/document-editor/useAiGeneration.ts`**
- Update `handleGenerateAllExcerpts`, `handleGenerateAllCategories`, `handleGenerateAllTags` to accept `selectedIndices?: Set<number>`. In the loop, skip documents whose index is not in the set (when provided).

**3. `src/hooks/useSimpleAiGeneration.ts`**
- Same change for `handleGenerateAllExcerpts`, `handleGenerateAllCategories`, `handleGenerateAllTags`, `handleGenerateAllSchemes`.

**4. `src/hooks/useStandardsAiGeneration.ts`**
- Same change for `handleGenerateAllExcerpts`, `handleGenerateAllCategories`, `handleGenerateAllTags`.

**5. `src/components/document/DocumentsTableView.tsx`**
- Update the props interface: `onGenerateAllExcerpts`, `onGenerateAllCategories`, `onGenerateAllTags`, `onGenerateAllSchemes` to accept `(selectedIndices?: Set<number>)`.
- Update the bulk action handlers to pass `selectedDocuments` to the callbacks:
  ```typescript
  const handleBulkGenerateExcerpts = async () => {
    await onGenerateAllExcerpts(selectedDocuments);
  };
  ```

**6. `src/components/document/editor/DocumentHeader.tsx`**
- Update props to match new signatures (the header "Generate All" buttons from single-doc view call without indices, which means process all — unchanged behavior).

**7. Parent editor components** (`DocumentEditor.tsx`, `SimpleDocumentEditor.tsx`, `StandardsDocumentEditor.tsx`)
- No changes needed — they already pass the hook functions through, and the new optional parameter is backwards compatible.

### Key detail
The `selectedIndices` parameter is optional. When called from the single-document header view (no selection UI), it passes nothing and all documents are processed (existing behavior preserved). When called from the table view, the selection set is passed.

