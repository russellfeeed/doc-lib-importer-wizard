import { supabase } from "@/integrations/supabase/client";

interface WordPressCredentials {
  url: string;
  username: string;
  password: string;
}

interface WordPressCategory {
  id: number;
  name: string;
  parent: number;
  count: number;
}

interface CategoryToCreate {
  name: string;
  parent?: number;
  description?: string;
}

// Get WordPress credentials from localStorage
export const getWordPressCredentials = (): WordPressCredentials | null => {
  try {
    // Primary: read individual keys written by Settings page
    const url = localStorage.getItem('wp_site_url');
    const username = localStorage.getItem('wp_username');
    const password = localStorage.getItem('wp_password');
    if (url && username && password) {
      return { url, username, password };
    }

    // Fallback: legacy single JSON key
    const saved = localStorage.getItem('wp_credentials');
    if (saved) {
      const credentials = JSON.parse(saved);
      if (credentials.url && credentials.username && credentials.password) {
        return credentials;
      }
    }
  } catch (error) {
    console.error('Error loading WordPress credentials:', error);
  }
  return null;
};

// Create a category in WordPress using the Supabase edge function
export const createWordPressCategory = async (
  categoryData: CategoryToCreate,
  credentials: WordPressCredentials
): Promise<WordPressCategory> => {
  const { data, error } = await supabase.functions.invoke('wordpress-proxy', {
    body: {
      url: credentials.url,
      username: credentials.username,
      password: credentials.password,
      action: 'create',
      categoryData
    }
  });

  if (error) {
    throw new Error(error.message || 'Failed to create WordPress category');
  }

  return data;
};

// Check if a category already exists in WordPress
export const findWordPressCategory = async (
  categoryName: string,
  parentId?: number,
  credentials?: WordPressCredentials
): Promise<WordPressCategory | null> => {
  const creds = credentials || getWordPressCredentials();
  if (!creds) return null;

  try {
    // Use the Supabase edge function to fetch categories
    const { data, error } = await supabase.functions.invoke('wordpress-proxy', {
      body: {
        url: creds.url,
        username: creds.username,
        password: creds.password,
        action: 'fetch',
        per_page: 100
      }
    });

    if (error) {
      throw new Error(error.message || 'Failed to fetch WordPress categories');
    }

    const categories: WordPressCategory[] = data;
    
    // Find category by name and parent
    return categories.find(cat => 
      cat.name.toLowerCase() === categoryName.toLowerCase() && 
      cat.parent === (parentId || 0)
    ) || null;
  } catch (error) {
    console.error('Error finding WordPress category:', error);
    return null;
  }
};

// Fetch WordPress taxonomies
export const fetchWordPressTaxonomies = async (
  taxonomySlug: string,
  credentials?: WordPressCredentials
): Promise<any[]> => {
  const creds = credentials || getWordPressCredentials();
  if (!creds) {
    throw new Error('WordPress credentials not found. Please configure them in the WordPress importer section.');
  }

  try {
    const { data, error } = await supabase.functions.invoke('wordpress-proxy', {
      body: {
        url: creds.url,
        username: creds.username,
        password: creds.password,
        action: 'fetch-taxonomy',
        taxonomySlug,
        per_page: 100
      }
    });

    if (error) {
      throw new Error(error.message || `Failed to fetch WordPress taxonomy ${taxonomySlug}`);
    }

    return data || [];
  } catch (error) {
    console.error(`Error fetching WordPress taxonomy ${taxonomySlug}:`, error);
    return [];
  }
};

// Decode common HTML entities that WordPress injects into title.rendered
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

// Normalize a standard number by stripping punctuation/whitespace for fuzzy comparison
const normalizeStandardNumber = (str: string): string => {
  return decodeHtmlEntities(str)
    .toLowerCase()
    .replace(/[\/\\:_\-.\s,'"]+/g, '')
    .trim();
};

// Session-level cache for DLP document titles
let dlpDocumentsCache: any[] | null = null;
let dlpCacheCredentialsKey: string | null = null;

const getDlpCacheKey = (creds: WordPressCredentials) => `${creds.url}|${creds.username}`;

// Clear the DLP documents cache (call when credentials change)
export const clearDlpDocumentsCache = () => {
  dlpDocumentsCache = null;
  dlpCacheCredentialsKey = null;
};

// Fetch all DLP document titles (with session cache)
const fetchAllDlpDocuments = async (credentials: WordPressCredentials): Promise<any[]> => {
  const cacheKey = getDlpCacheKey(credentials);
  if (dlpDocumentsCache && dlpCacheCredentialsKey === cacheKey) {
    console.log(`Using cached DLP documents (${dlpDocumentsCache.length} items)`);
    return dlpDocumentsCache;
  }
  console.log('Fetching fresh DLP documents...');

  const { data, error } = await supabase.functions.invoke('wordpress-proxy', {
    body: {
      url: credentials.url,
      username: credentials.username,
      password: credentials.password,
      action: 'fetch-all-dlp-titles',
    }
  });

  if (error || !Array.isArray(data)) {
    throw new Error(error?.message || 'Failed to fetch DLP documents');
  }

  dlpDocumentsCache = data;
  dlpCacheCredentialsKey = cacheKey;
  console.log(`Cached ${data.length} DLP documents`);
  return data;
};

// Check if a DLP document already exists in WordPress by standard number
export const checkExistingDlpDocument = async (
  standardNumber: string
): Promise<{ id: number; title: string; status: string; link: string; date: string } | null> => {
  const credentials = getWordPressCredentials();
  if (!credentials) {
    console.log('WordPress credentials not configured - skipping DLP duplicate check');
    return null;
  }
  if (!standardNumber) {
    console.log('No standard number provided - skipping DLP duplicate check');
    return null;
  }

  try {
    console.log(`Fetching all DLP documents to check for: "${standardNumber}"`);
    const allDocs = await fetchAllDlpDocuments(credentials);

    const normalizedSearch = normalizeStandardNumber(standardNumber);
    console.log(`Searching ${allDocs.length} documents, normalized search: "${normalizedSearch}"`);
    
    const match = allDocs.find((doc: any) => 
      normalizeStandardNumber(doc.title?.rendered || '').includes(normalizedSearch)
    );

    if (match) {
      console.log(`Match found: "${match.title?.rendered}" (ID: ${match.id})`);
      return {
        id: match.id,
        title: match.title?.rendered || '',
        status: match.status || '',
        link: match.link || '',
        date: match.date || ''
      };
    }

    console.log(`No existing WordPress document found for: "${standardNumber}"`);
    return null;
  } catch (error) {
    console.error('Error checking existing DLP document:', error);
    return null;
  }
};

// Check existing DLP document with step-by-step logging callback
export const checkExistingDlpDocumentWithLogs = async (
  standardNumber: string,
  log: (message: string, type: 'info' | 'success' | 'warning' | 'error' | 'detail') => void
): Promise<{ id: number; title: string; status: string; link: string; date: string } | null> => {
  log('Checking WordPress credentials...', 'info');
  const credentials = getWordPressCredentials();
  if (!credentials) {
    log('WordPress credentials not configured - cannot check duplicates.', 'error');
    return null;
  }
  log(`Connected to: ${credentials.url}`, 'success');
  log(`API user: ${credentials.username}`, 'info');

  if (!standardNumber) {
    log('No standard number provided — nothing to search for.', 'warning');
    return null;
  }
  log(`Standard number: ${standardNumber}`, 'info');

  const normalizedSearch = normalizeStandardNumber(standardNumber);
  log(`Normalized search term: "${normalizedSearch}"`, 'info');

  try {
    const cacheKey = getDlpCacheKey(credentials);
    const usingCache = dlpDocumentsCache && dlpCacheCredentialsKey === cacheKey;
    log(usingCache ? 'Using cached DLP documents...' : 'Fetching all DLP documents (now including draft/private/pending)...', 'info');

    const allDocs = await fetchAllDlpDocuments(credentials);
    log(`${usingCache ? 'Cached' : 'Fetched'}: ${allDocs.length} documents`, 'info');

    log('Comparing against documents...', 'info');

    let match: any = null;

    for (let i = 0; i < allDocs.length; i++) {
      const doc = allDocs[i];
      const title = doc.title?.rendered || '(untitled)';
      const normalizedTitle = normalizeStandardNumber(title);
      const isMatch = normalizedTitle.includes(normalizedSearch);

      const prefix = isMatch ? '✅ MATCH' : '  ';
      log(`${prefix} [${i + 1}] ID:${doc.id} "${title}" → "${normalizedTitle}"`, isMatch ? 'success' : 'detail');

      if (isMatch && !match) {
        match = doc;
      }
    }

    if (match) {
      log(`MATCH FOUND: "${match.title?.rendered}" (ID: ${match.id})`, 'success');
      return {
        id: match.id,
        title: match.title?.rendered || '',
        status: match.status || '',
        link: match.link || '',
        date: match.date || ''
      };
    }

    log(`No existing WordPress document found for: "${standardNumber}"`, 'warning');
    return null;
  } catch (error: any) {
    log(`Error: ${error.message || 'Unknown error during duplicate check'}`, 'error');
    return null;
  }
};

// Fetch full detail for a single DLP document (with resolved category/tag names)
export const fetchDlpDocumentDetail = async (
  documentId: number
): Promise<{ id: number; title: string; excerpt: string; categories: string; tags: string; status: string; link: string; date: string } | null> => {
  const credentials = getWordPressCredentials();
  if (!credentials) return null;

  try {
    const { data, error } = await supabase.functions.invoke('wordpress-proxy', {
      body: {
        url: credentials.url,
        username: credentials.username,
        password: credentials.password,
        action: 'fetch-dlp-detail',
        documentId,
      }
    });

    if (error) {
      console.error('Failed to fetch DLP document detail:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching DLP document detail:', error);
    return null;
  }
};

// Compare local document fields with WordPress data
export const compareDocumentFields = (
  local: { name: string; excerpt: string; categories: string; tags: string },
  wp: { title: string; excerpt: string; categories: string; tags: string }
): Array<{ field: string; localValue: string; wpValue: string; isDifferent: boolean }> => {
  const stripHtml = (s: string) => s.replace(/<[^>]*>/g, '').trim();
  const norm = (s: string) => stripHtml(s).toLowerCase().replace(/\s+/g, ' ').trim();

  return [
    { field: 'Title', localValue: local.name, wpValue: stripHtml(wp.title), isDifferent: norm(local.name) !== norm(wp.title) },
    { field: 'Excerpt', localValue: local.excerpt, wpValue: stripHtml(wp.excerpt), isDifferent: norm(local.excerpt) !== norm(wp.excerpt) },
    { field: 'Categories', localValue: local.categories, wpValue: wp.categories, isDifferent: norm(local.categories) !== norm(wp.categories) },
    { field: 'Tags', localValue: local.tags, wpValue: wp.tags, isDifferent: norm(local.tags) !== norm(wp.tags) },
  ];
};

// Upload file to WordPress Media Library and update the matched DLP document
// Now uses two sequential edge function calls for granular progress
export type UploadProgressStep = 'converting' | 'uploading-media' | 'creating-document' | 'trashing-old' | 'done';

export interface UploadAndUpdateResult {
  success: boolean;
  mediaId?: number;
  sourceUrl?: string;
  pdaUrl?: string;
  relativePdaPath?: string;
  categoryIds?: number[];
  tagIds?: number[];
  resolvedCategories?: Record<string, number | null>;
  resolvedTags?: Record<string, number | null>;
  newDocumentId?: number;
  oldDocumentId?: number;
  trashedOld?: boolean;
  error?: string;
  errorStep?: UploadProgressStep;
}

export const uploadAndUpdateDlpDocument = async (
  document: import('@/types/document').DocumentFile,
  onProgress?: (step: UploadProgressStep, detail?: string) => void
): Promise<UploadAndUpdateResult> => {
  const credentials = getWordPressCredentials();
  if (!credentials) {
    return { success: false, error: 'WordPress credentials not configured' };
  }

  if (!document.wpExisting?.id) {
    return { success: false, error: 'No matched WordPress document ID' };
  }

  if (!document.file) {
    return { success: false, error: 'No file available for upload' };
  }

  // Step 1: Convert file to base64
  onProgress?.('converting', document.file.name);
  const fileData = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(document.file);
  });

  try {
    // Step 2: Upload to Media Library
    onProgress?.('uploading-media', 'Sending file to WordPress…');
    const { data: mediaData, error: mediaError } = await supabase.functions.invoke('wordpress-proxy', {
      body: {
        url: credentials.url,
        username: credentials.username,
        password: credentials.password,
        action: 'upload-media-only',
        fileData,
        fileName: document.file.name,
        fileType: document.file.type,
      }
    });

    if (mediaError || !mediaData?.success) {
      return {
        success: false,
        error: mediaError?.message || mediaData?.error || 'Media upload failed',
        errorStep: 'uploading-media',
      };
    }

    onProgress?.('uploading-media', `Media ID: ${mediaData.mediaId}`);

    // Step 3: Resolve terms + create new document + trash old
    onProgress?.('creating-document', 'Creating new DLP document…');
    const { data: replaceData, error: replaceError } = await supabase.functions.invoke('wordpress-proxy', {
      body: {
        url: credentials.url,
        username: credentials.username,
        password: credentials.password,
        action: 'create-and-replace-dlp',
        documentId: document.wpExisting.id,
        mediaId: mediaData.mediaId,
        title: document.name,
        excerpt: document.excerpt,
        categories: document.categories,
        tags: document.tags,
      }
    });

    if (replaceError || !replaceData?.success) {
      return {
        success: false,
        mediaId: mediaData.mediaId,
        sourceUrl: mediaData.sourceUrl,
        error: replaceError?.message || replaceData?.error || 'Document create/replace failed',
        errorStep: 'creating-document',
      };
    }

    // Build detail strings for progress
    const catDetail = replaceData.categoryIds?.length
      ? `Categories: [${replaceData.categoryIds.join(', ')}]`
      : 'Categories: none matched';
    const tagDetail = replaceData.tagIds?.length
      ? `Tags: [${replaceData.tagIds.join(', ')}]`
      : 'Tags: none matched';
    onProgress?.('creating-document', `New post ${replaceData.newDocumentId} · ${catDetail} · ${tagDetail}`);

    onProgress?.('trashing-old', replaceData.trashedOld
      ? `Post ${replaceData.oldDocumentId} trashed`
      : `Could not trash post ${replaceData.oldDocumentId}`);
    onProgress?.('done');

    return {
      success: true,
      mediaId: mediaData.mediaId,
      sourceUrl: mediaData.sourceUrl,
      pdaUrl: mediaData.pdaUrl,
      relativePdaPath: mediaData.relativePdaPath,
      categoryIds: replaceData.categoryIds,
      tagIds: replaceData.tagIds,
      resolvedCategories: replaceData.resolvedCategories,
      resolvedTags: replaceData.resolvedTags,
      newDocumentId: replaceData.newDocumentId,
      oldDocumentId: replaceData.oldDocumentId,
      trashedOld: replaceData.trashedOld,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Upload failed' };
  }
};

// Push a single category to WordPress, creating it if it doesn't exist
export const pushCategoryToWordPress = async (
  categoryName: string,
  parentId?: number
): Promise<WordPressCategory> => {
  const credentials = getWordPressCredentials();
  if (!credentials) {
    throw new Error('WordPress credentials not found. Please configure them in the WordPress importer section.');
  }

  // Check if category already exists
  const existingCategory = await findWordPressCategory(categoryName, parentId, credentials);
  if (existingCategory) {
    return existingCategory;
  }

  // Create new category
  const categoryData: CategoryToCreate = {
    name: categoryName,
    ...(parentId && { parent: parentId })
  };

  return await createWordPressCategory(categoryData, credentials);
};