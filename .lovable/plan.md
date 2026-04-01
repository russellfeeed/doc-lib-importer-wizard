

## Fix: Replace Smart Quotes Before Stripping Non-ASCII

### Problem
The current `cleanText` function normalizes with NFKD then strips non-ASCII. However, curly quotes (`"` `"`) and smart apostrophes (`'` `'`) don't decompose under NFKD — they're simply deleted. This loses meaningful punctuation. The fix is to explicitly map smart punctuation to ASCII equivalents before the strip.

### Change (1 file)

**`src/utils/csvUtils.ts`** — Update `cleanText` (lines 334-339)

```typescript
const cleanText = (str: string): string => {
  if (!str) return str;
  return str
    .replace(/[\u2018\u2019\u201A\u2032\u0060]/g, "'")   // smart single quotes → '
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')           // smart double quotes → "
    .replace(/[\u2013\u2014\u2015]/g, '-')                 // en/em dashes → -
    .replace(/\u2026/g, '...')                              // ellipsis → ...
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "");
};
```

This ensures smart punctuation is preserved as ASCII equivalents instead of being silently deleted, making the CSV bulletproof for Barn2 import.

