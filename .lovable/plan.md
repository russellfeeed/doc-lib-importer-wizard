

## Plan: Disable AI by Default & Show All Documents View on Standards

### Changes

**1. `src/hooks/useStandardsFileUpload.ts` (line 17)**
- Change `useState(true)` → `useState(false)` for `aiEnabled` so AI summarization is disabled by default.

**2. `src/hooks/document-editor/useDocumentState.ts` (line 18)**
- Change `useState(false)` → `useState(true)` for `isEditingAll` so the "All Documents" table view is shown by default when entering the edit step.

Two one-line changes, no structural modifications.

