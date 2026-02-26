

## Fix: WordPress Duplicate Check Not Matching (Post 35179)

### Root Cause
The edge function successfully fetches 237 DLP documents, but the matching fails. WordPress `title.rendered` contains HTML entities (e.g., `&#8211;` for en-dash `–`, `&#47;` for `/`, `&#8217;` for apostrophe). The `normalizeStandardNumber` function strips certain punctuation characters but does NOT decode HTML entities first, so the normalized title retains garbage like `82117` instead of properly removing dashes.

For example, if WordPress stores the title as:
`DD CLC/TS 50131&#8211;7:2010`

Normalization produces: `ddclcts50131821172010` (wrong)
Instead of: `ddclcts5013172010` (correct)

### Changes

#### 1. Add HTML entity decoding before normalization (`src/utils/wordpressUtils.ts`)

Update `normalizeStandardNumber` to first decode HTML entities using a simple regex replacement for common entities (`&#8211;`, `&#8212;`, `&#8217;`, `&#8220;`, `&#8221;`, `&amp;`, `&lt;`, `&gt;`, `&#47;`, etc.), then also strip any remaining `&#...;` patterns. This ensures the comparison works regardless of WordPress encoding.

```text
const decodeHtmlEntities = (str: string): string => {
  return str
    .replace(/&#8211;/g, '-')   // en-dash
    .replace(/&#8212;/g, '-')   // em-dash
    .replace(/&#8217;/g, "'")   // right single quote
    .replace(/&#8220;/g, '"')   // left double quote
    .replace(/&#8221;/g, '"')   // right double quote
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#\d+;/g, '')     // strip any remaining numeric entities
    .replace(/&\w+;/g, '');     // strip any remaining named entities
};

const normalizeStandardNumber = (str: string): string => {
  return decodeHtmlEntities(str)
    .toLowerCase()
    .replace(/[\/\\:_\-.\s,]+/g, '')
    .trim();
};
```

#### 2. Show all documents in the modal log (`src/utils/wordpressUtils.ts`)

Change `showLimit` from 30 to show ALL documents in `checkExistingDlpDocumentWithLogs`, so the user can scroll through and find post 35179. This is a debugging modal, so completeness matters more than brevity.

#### 3. Show document ID in the modal log

Update the log line in `checkExistingDlpDocumentWithLogs` to include the WordPress post ID:

```text
log(`${prefix} [${i + 1}] ID:${doc.id} "${title}" -> "${normalizedTitle}"`, ...);
```

This way the user can immediately see post 35179 in the list and verify whether the title/normalization is correct.

### Files to edit
- `src/utils/wordpressUtils.ts` -- add `decodeHtmlEntities`, update `normalizeStandardNumber`, increase `showLimit`, add post IDs to log output
