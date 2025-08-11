import { supabase } from '@/integrations/supabase/client';

export interface WordPressSettings {
  id?: string;
  site_url: string;
  username: string;
  password: string;
  created_at?: string;
  updated_at?: string;
}

export async function getWordPressSettings(): Promise<WordPressSettings | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('No authenticated user found');
      return null;
    }

    const { data, error } = await supabase
      .from('wordpress_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No settings found, return null
        return null;
      }
      console.error('Error fetching WordPress settings:', error);
      return null;
    }

    return {
      id: data.id,
      site_url: data.site_url,
      username: data.username,
      password: data.password,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  } catch (error) {
    console.error('Error in getWordPressSettings:', error);
    return null;
  }
}

export async function saveWordPressSettings(settings: Omit<WordPressSettings, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No authenticated user found');
      return false;
    }

    // Check if settings already exist
    const existingSettings = await getWordPressSettings();
    
    if (existingSettings) {
      // Update existing settings
      const { error } = await supabase
        .from('wordpress_settings')
        .update({
          site_url: settings.site_url,
          username: settings.username,
          password: settings.password
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating WordPress settings:', error);
        return false;
      }
    } else {
      // Create new settings
      const { error } = await supabase
        .from('wordpress_settings')
        .insert({
          user_id: user.id,
          site_url: settings.site_url,
          username: settings.username,
          password: settings.password
        });

      if (error) {
        console.error('Error creating WordPress settings:', error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error in saveWordPressSettings:', error);
    return false;
  }
}

export async function deleteWordPressSettings(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No authenticated user found');
      return false;
    }

    const { error } = await supabase
      .from('wordpress_settings')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting WordPress settings:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteWordPressSettings:', error);
    return false;
  }
}

export function hasWordPressSettings(): boolean {
  // For backward compatibility, check localStorage first
  const siteUrl = localStorage.getItem('wp_site_url');
  const username = localStorage.getItem('wp_username');
  const password = localStorage.getItem('wp_password');

  return !!(siteUrl && username && password);
}

export function promptForWordPressSettings(): void {
  alert('Please configure WordPress settings in the Settings page first.');
}

// Migration helper: Move localStorage settings to Supabase
export async function migrateLocalStorageToSupabase(): Promise<boolean> {
  try {
    const siteUrl = localStorage.getItem('wp_site_url');
    const username = localStorage.getItem('wp_username');
    const password = localStorage.getItem('wp_password');

    if (siteUrl && username && password) {
      const success = await saveWordPressSettings({
        site_url: siteUrl,
        username: username,
        password: password
      });

      if (success) {
        // Clear localStorage after successful migration
        localStorage.removeItem('wp_site_url');
        localStorage.removeItem('wp_username');
        localStorage.removeItem('wp_password');
        console.log('Successfully migrated WordPress settings from localStorage to Supabase');
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error migrating WordPress settings:', error);
    return false;
  }
}