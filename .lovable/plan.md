

## More Granular Upload Progress Modal

### Problem
The current modal lumps "Uploading to Media Library & updating document" into a single step because it's one edge function call. The user can't see what's happening inside, and the logs show categories are resolving to `[]` (empty) which needs visibility.

### Approach: Split into 2 sequential edge function calls

Instead of one monolithic `upload-and-update-dlp` action, split into:
1. **`upload-media-only`** — uploads file to Media Library, returns `mediaId`, `sourceUrl`, `pdaUrl`
2. **`update-dlp-only`** — resolves terms, updates document metadata + attachment link, returns resolved IDs and update result

This gives real-time progress across 5 modal steps:

```text
 1. Converting file to base64          ✅ PD CLC TS 50131-2-9_2016.pdf
 2. Uploading to Media Library          ✅ Media ID: 35331
 3. Resolving categories & tags         ✅ Categories: [12, 45] · Tags: [74, 655, 656]
 4. Updating DLP document               ✅ Post 35179 updated
 5. Complete                            ✅
```

### Files to change

**1. `supabase/functions/wordpress-proxy/index.ts`**
- Add new action `upload-media-only`: just steps A+B from current code (upload file, derive PDA path), return `{ mediaId, sourceUrl, pdaUrl, relativePdaPath }`
- Add new action `update-dlp-only`: takes `documentId`, `mediaId`, `title`, `excerpt`, `categories`, `tags` — does steps C+D (resolve terms, update document), returns `{ categoryIds, tagIds, documentId, success }`
- Keep existing `upload-and-update-dlp` for backward compatibility
- Redeploy edge function

**2. `src/utils/wordpressUtils.ts`**
- Replace `uploadAndUpdateDlpDocument` with two sequential calls: `uploadMediaToWordPress` and `updateDlpDocumentMeta`
- Keep the combined wrapper function but now calling the two steps internally with progress callbacks at each boundary
- New progress stages: `'converting'`, `'uploading-media'`, `'resolving-terms'`, `'updating-document'`, `'done'`

**3. `src/components/document/editor/WpComparisonPanel.tsx`**
- Update `initialSteps` to 5 steps
- Update `handleUploadAndUpdate` to map new progress stages to the 5 steps
- Show resolved term IDs and media ID in step details

**4. `src/components/document/editor/WpUploadProgressModal.tsx`**
- Update `UploadResult` to include `categoryIds`, `tagIds`
- Show resolved taxonomy info in the result summary

### Debugging insight
The logs show `Resolved categories: []` — the category names from the document aren't matching any `doc_categories` terms. The granular modal will make this visible so the user can see exactly which terms resolved and which didn't.

