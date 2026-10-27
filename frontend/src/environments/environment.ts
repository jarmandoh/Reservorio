declare global {
  interface Window {
    __APP_CONFIG__?: {
      apiUrl?: string;
      storyDataUrl?: string;
      supabaseUrl?: string;
      supabasePublishableKey?: string;
    };
  }
}

export const environment = {
  production: false,
  apiUrl: window.__APP_CONFIG__?.apiUrl ?? 'http://localhost:3000/api',
  storyDataUrl: window.__APP_CONFIG__?.storyDataUrl ?? '/assets/data/test-story.json',
  supabaseUrl: window.__APP_CONFIG__?.supabaseUrl ?? 'https://afgoyjoasxjnsliblsde.supabase.co',
  supabasePublishableKey:
    window.__APP_CONFIG__?.supabasePublishableKey ?? 'sb_publishable_XaukbVPbWcwQaLDb7qKBJg_QUL0rV37',
};
