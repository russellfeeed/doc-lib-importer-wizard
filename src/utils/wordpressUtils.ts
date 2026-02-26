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

// Normalize a standard number by stripping punctuation/whitespace for fuzzy comparison
const normalizeStandardNumber = (str: string): string => {
  return str
    .toLowerCase()
    .replace(/[\/\\:_\-.\s,]+/g, '')
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
    console.log(`Using cached DLP documents (${dlpDocumentsCache.length} entries)`);
    return dlpDocumentsCache;
  }

  const { data, error } = await supabase.functions.invoke('wordpress-proxy', {
    body: {
      url: credentials.url,
      username: credentials.username,
      password: credentials.password,
      action: 'fetch-all-dlp-titles'
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