

## Bulletproof CSV Sanitization

### Problem
The current `cleanText` strips non-ASCII after NFKD normalization but does **not** remove control characters (`\x00-\x1F`, `\x7F`) or private-use Unicode (`\uE000-\uF8FF`). These survive into the CSV and cause Barn2 import failures.

### Change (1 file)

**`src/utils/csvUtils.ts`** — Update `cleanText` (lines 334-343)

```typescript
const cleanText = (str: string): string => {
  if (!str) return str;
  return str
    .replace(/[\u2018\u2019\u201A\u2032\u0060]/g, "'")   // smart single quotes → '
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')           // smart double quotes → "
    .replace(/[\u2013\u2014\u2015]/g, '-')                 // en/em dashes → -
    .replace(/\u2026/g, '...')                              // ellipsis → ...
    .normalize("NFKD")
    .replace(/[\uE000-\uF8FF]/g, "")                       // remove private-use unicode
    .replace(/[\x00-\x1F\x7F]/g, "")                       // remove control characters
    .replace(/[^\x00-\x7F]/g, "")                           // strip remaining non-ASCII
    .trim();
};
```

Key additions vs current code:
1. **Private-use Unicode removal** (`\uE000-\uF8FF`) — catches PDF artifacts like `\uf8e7`, `\uec90`
2. **Control character removal** (`\x00-\x1F`, `\x7F`) — strips nulls, tabs, form feeds, etc.
3. **`.trim()`** — removes leading/trailing whitespace artifacts

Order matters: smart-quote replacements → NFKD normalize → private-use strip → control char strip → non-ASCII strip → trim.

### Validation logging

Add a validation wrapper used during CSV row generation to log rows that required cleaning:

```typescript
const cleanAndValidate = (value: string, fieldName: string, rowIndex: number): string => {
  const cleaned = cleanText(value);
  if (value && cleaned !== value) {
    console.warn(`[CSV Clean] Row ${rowIndex + 1}, field "${fieldName}": characters were sanitized`);
  }
  return cleaned;
};
```

Update `forceQuoteCsvValue` to accept optional field/row context, and use `cleanAndValidate` in the main loop where rows are built (around lines 175-250) for the key fields: Name, Content, Excerpt, Categories, Tags.

### Result
- All control characters, private-use Unicode, and non-ASCII artifacts removed
- Smart punctuation preserved as ASCII equivalents
- Console warnings flag any rows that needed cleaning
- CSV is strict ASCII-safe UTF-8 with no BOM

