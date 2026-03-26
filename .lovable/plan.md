

## Fix: Forward Slash in Filenames Stripped by WordPress

### Root Cause

Standard numbers like `BS EN ISO/IEC 27002:2022` contain a forward slash (`/`). When this is used in the upload filename, WordPress's file handling interprets `/` as a directory separator and strips everything before it. Result: `IEC-270022022-...` instead of `BS-EN-ISO-IEC-270022022-...`.

### Changes (2 files)

**1. `src/components/WordPressUploader.tsx` (line ~151)**
Add `.replace(/\//g, '-')` to the sanitization chain so `ISO/IEC` becomes `ISO-IEC`.

**2. `supabase/functions/wordpress-upload/index.ts` (line ~228)**
Same - add `.replace(/\//g, '-')` to the filename sanitization so the edge function also strips slashes.

### Result
`BS EN ISO/IEC 27002:2022 - Information security controls.pdf`
becomes `BS-EN-ISO-IEC-270022022-Information-security-controls.pdf`

