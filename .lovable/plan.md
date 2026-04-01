

## Fix: Clean Non-ASCII Characters from CSV Export

### Problem
The CSV output contains stray Unicode characters (smart quotes, accented characters, special symbols, etc.) that cause issues on import. Currently only non-ASCII hyphens are cleaned — all other non-ASCII characters pass through untouched.

### Change (1 file)

**`src/utils/csvUtils.ts`**

1. Add a `cleanText` helper function that normalizes Unicode (NFKD decomposition) and strips non-ASCII characters:

```typescript
const cleanText = (str: string): string => {
  if (!str) return str;
  return str
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "");
};
```

2. Apply `cleanText` inside `forceQuoteCsvValue` and `escapeCsvValue` before any other processing, so every field in the CSV is cleaned. This replaces the narrower `cleanNonAsciiHyphens` call since `cleanText` already removes all non-ASCII characters including those hyphens.

3. Update `forceQuoteCsvValue`:
```typescript
const forceQuoteCsvValue = (value: string): string => {
  if (!value) return '""';
  return `"${cleanText(value).replace(/"/g, '""')}"`;
};
```

4. Update `escapeCsvValue`:
```typescript
const escapeCsvValue = (value: string): string => {
  if (!value) return '';
  const cleaned = cleanText(value);
  if (cleaned.includes(',') || cleaned.includes('"') || cleaned.includes('\n')) {
    return `"${cleaned.replace(/"/g, '""')}"`;
  }
  return cleaned;
};
```

### Result
All text fields in the CSV will be normalized to ASCII-only, eliminating smart quotes, accented remnants, non-breaking spaces, and any other Unicode artifacts before export.

