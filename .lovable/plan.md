

## Display WordPress Username in Duplicate Check Log

**What changes:**

In `src/utils/wordpressUtils.ts`, inside `checkExistingDlpDocumentWithLogs`, add a log line showing the WordPress username right after the "Connected to" log (around line 257). The credentials object is already available at that point.

**Change:**
After the existing line:
```
log(`Connected to: ${credentials.url}`, 'success');
```
Add:
```
log(`API user: ${credentials.username}`, 'info');
```

Single line change, one file.

