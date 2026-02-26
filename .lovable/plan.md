
## Fix: WordPress Credentials Mismatch + Add Credentials to Standards Page

### Root Cause Found
The WordPress duplicate check **never runs** because of a localStorage key mismatch:

- **Settings page** saves credentials as three separate keys: `wp_site_url`, `wp_username`, `wp_password`
- **`getWordPressCredentials()`** looks for a single JSON key: `wp_credentials`

These never match, so the function always returns `null` and the check is silently skipped.

### Changes

#### 1. Fix `getWordPressCredentials()` in `src/utils/wordpressUtils.ts`

Update the function to read from the keys the Settings page actually writes (`wp_site_url`, `wp_username`, `wp_password`), falling back to the old `wp_credentials` key for backward compatibility.

#### 2. Add a WordPress credentials indicator on the Standards upload step

Add a small status bar at the top of the `FileUploader` component (when `isStandards=true`) showing:
- **Green**: "WordPress connected: yoursite.com" -- credentials are configured
- **Amber warning**: "WordPress not configured -- duplicate check will be skipped. [Configure in Settings](/settings)" -- with a link to Settings

This goes in `src/components/file-uploader/FileUploader.tsx` using a new small `WordPressStatus` component, so users know immediately whether the check will work before uploading files.

#### 3. Files to change

- `src/utils/wordpressUtils.ts` -- fix `getWordPressCredentials()` (~5 lines)
- `src/components/file-uploader/FileUploader.tsx` -- add status indicator (~10 lines)
- New file: `src/components/file-uploader/WordPressStatus.tsx` -- small status component (~30 lines)
