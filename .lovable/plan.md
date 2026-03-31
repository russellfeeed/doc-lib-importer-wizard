

## Fix: Replace All Hardcoded WordPress URLs with Dynamic Settings

### Root Cause
`DocumentContent.tsx` generates File URL and Direct URL placeholders using the hardcoded `dev.members.nsi.org.uk`. These values get stored on each document object. When the CSV is generated, it checks `docFile.fileUrl || fileUrlPath` — since `fileUrl` is already populated (with the hardcoded domain), the dynamic fallback never runs.

### Changes (3 files)

**1. `src/components/document/editor/DocumentContent.tsx`** (lines 32-50)
- Import `getWordPressSettings` from `settingsUtils`
- Replace the 3 hardcoded `https://dev.members.nsi.org.uk` references with a dynamic lookup using the same `getWpBaseUrl` pattern

**2. `src/components/CSVGenerator.tsx`** (line 248)
- Replace hardcoded admin link with dynamic `${baseUrl}/wp-admin/admin.php?page=dlp_import_csv`

**3. `src/pages/Help.tsx`** (lines 176, 177, 230)
- Replace hardcoded URLs with dynamic lookups or note them as "default" examples (these are documentation/help text, so could remain as examples with a note)

### Result
URLs throughout the app — including the editor placeholders that feed into the CSV — will honour the configured WordPress site URL.

