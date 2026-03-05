

## Progress Modal for Upload & Update

### What
Replace the inline button loading state with a modal dialog that shows step-by-step progress as the upload and update happens. The modal will display each stage with status indicators:

1. **Converting file** — preparing base64 data
2. **Uploading to Media Library** — sending file to WordPress
3. **Updating Document Library** — updating metadata, categories, tags, and file link
4. **Complete** — summary with media ID and URLs

### Approach

**1. New component: `src/components/document/editor/WpUploadProgressModal.tsx`**

A Dialog component that receives:
- `open: boolean`, `onOpenChange`
- `steps: { label: string; status: 'pending' | 'active' | 'done' | 'error'; detail?: string }[]`
- `isComplete: boolean`, `error?: string`
- `result?: { mediaId, sourceUrl, pdaUrl, relativePdaPath }`

Renders a vertical list of steps, each with a spinner (active), check (done), or X (error) icon. On completion, shows a success summary with the media ID and URLs.

**2. Modify `WpComparisonPanel.tsx`**

- Add state for `showModal`, `steps[]`, and `result`
- Refactor `handleUploadAndUpdate` to update step statuses as progress occurs
- Since the edge function is a single call, we simulate granular steps:
  - Step 1 ("Converting file") completes after base64 conversion (move conversion here from `wordpressUtils.ts`)
  - Step 2 ("Uploading & updating") goes active when calling the edge function
  - Step 3 ("Complete") on success
- Open the modal when the button is clicked
- Render `<WpUploadProgressModal />` at the bottom

**3. Refactor `src/utils/wordpressUtils.ts` — `uploadAndUpdateDlpDocument`**

Add an optional `onProgress` callback parameter so the caller can track stages:
```ts
onProgress?: (step: string) => void
```
Called at key points: `'converting'`, `'uploading'`, `'complete'`.

### Files to create/modify
- **Create** `src/components/document/editor/WpUploadProgressModal.tsx`
- **Modify** `src/components/document/editor/WpComparisonPanel.tsx` — add modal state, step tracking, render modal
- **Modify** `src/utils/wordpressUtils.ts` — add `onProgress` callback to `uploadAndUpdateDlpDocument`

