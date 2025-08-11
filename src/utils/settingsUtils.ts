import { getWordPressSettings as getSupabaseWordPressSettings } from './wordpressSettingsUtils';

export interface WordPressSettings {
  siteUrl: string;
  username: string;
  password: string;
}

export async function getWordPressSettings(): Promise<WordPressSettings | null> {
  // First try to get from Supabase
  const supabaseSettings = await getSupabaseWordPressSettings();
  
  if (supabaseSettings) {
    return {
      siteUrl: supabaseSettings.site_url,
      username: supabaseSettings.username,
      password: supabaseSettings.password
    };
  }

  // Fallback to localStorage for backward compatibility
  const siteUrl = localStorage.getItem('wp_site_url');
  const username = localStorage.getItem('wp_username');
  const password = localStorage.getItem('wp_password');

  if (!siteUrl || !username || !password) {
    return null;
  }

  return { siteUrl, username, password };
}

export async function hasWordPressSettings(): Promise<boolean> {
  const settings = await getWordPressSettings();
  return !!settings;
}

export function promptForWordPressSettings(): string {
  return 'WordPress settings are required to determine document schemes. Please configure your WordPress connection in Settings.';
}