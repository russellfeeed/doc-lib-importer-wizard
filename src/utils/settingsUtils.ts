export interface WordPressSettings {
  siteUrl: string;
  username: string;
  password: string;
}

export function getWordPressSettings(): WordPressSettings | null {
  const siteUrl = localStorage.getItem('wp_site_url');
  const username = localStorage.getItem('wp_username');
  const password = localStorage.getItem('wp_password');

  if (!siteUrl || !username || !password) {
    return null;
  }

  return { siteUrl, username, password };
}

export function hasWordPressSettings(): boolean {
  return getWordPressSettings() !== null;
}

export function promptForWordPressSettings(): string {
  return 'WordPress settings are required to determine document schemes. Please configure your WordPress connection in Settings.';
}