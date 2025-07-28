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
  const response = await fetch('/functions/v1/wordpress-proxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: credentials.url,
      username: credentials.username,
      password: credentials.password,
      action: 'create',
      categoryData
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to create WordPress category');
  }

  return await response.json();
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
    // Use the existing Supabase edge function to fetch categories
    const response = await fetch('/functions/v1/wordpress-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: creds.url,
        username: creds.username,
        password: creds.password,
        action: 'fetch',
        per_page: 100
      })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch WordPress categories');
    }

    const categories: WordPressCategory[] = await response.json();
    
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