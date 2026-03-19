

## Remove Standards-Specific CSV Columns

### What changes
Remove the "Standard Number" and "Document Title" columns from the CSV output for standards documents, so the generated CSV matches the standard Barn2 DLP import format.

### File to modify
**`src/utils/csvUtils.ts`** — Remove the standards-specific header/row logic:
- Lines 122-124: Remove the `if (isStandards)` block that pushes `'Standard Number'` and `'Document Title'` to headers
- Lines 246-249: Remove the `if (isStandards)` block that adds `row['Standard Number']` and `row['Document Title']`

The resulting CSV headers for standards will be identical to regular documents: `Name,Categories,Tags,Document Authors,File URL,Direct URL,Featured Image URL,File Size,Excerpt,Content,Published`

