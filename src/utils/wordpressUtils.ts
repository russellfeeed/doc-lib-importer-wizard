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

// Check if a DLP document already exists in WordPress by standard number
export const checkExistingDlpDocument = async (
  standardNumber: string
): Promise<{ id: number; title: string; status: string; link: string; date: string } | null> => {
  const credentials = getWordPressCredentials();
  if (!credentials || !standardNumber) return null;

  try {
    const { data, error } = await supabase.functions.invoke('wordpress-proxy', {
      body: {
        url: credentials.url,
        username: credentials.username,
        password: credentials.password,
        action: 'search-dlp-documents',
        searchTerm: standardNumber
      }
    });

    if (error || !Array.isArray(data) || data.length === 0) return null;

    // Find match using normalized comparison
    const normalizedSearch = normalizeStandardNumber(standardNumber);
    const match = data.find((doc: any) => 
      normalizeStandardNumber(doc.title?.rendered || '').includes(normalizedSearch)
    );

    if (match) {
      return {
        id: match.id,
        title: match.title?.rendered || '',
        status: match.status || '',
        link: match.link || '',
        date: match.date || ''
      };
    }

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