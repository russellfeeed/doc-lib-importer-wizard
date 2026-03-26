

## Plan: Add Explicit Forward Slash Handling to CSV Link Generation

### Current State
In `src/utils/csvUtils.ts` (line 234), the sanitization chain handles em/en dashes and `+` explicitly, but forward slashes are only caught by the catch-all `[^a-zA-Z0-9.\-]` regex on line 245 — which happens to replace them with `-`, producing the correct output.

The WordPress uploader and edge function both have explicit `.replace(/\//g, '-')`. The CSV generation should match for consistency and clarity.

### Change (1 file)

**`src/utils/csvUtils.ts` (line 234)**
Add `.replace(/\//g, '-')` to the explicit sanitization chain:
```
uploadName = uploadName.replace(/[–—]/g, '-').replace(/\+/g, '').replace(/\//g, '-');
```

### Impact
No functional change — the output is already correct. This just makes the slash handling explicit and consistent with the other two files.

