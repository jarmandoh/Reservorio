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
  production: true,
  apiUrl: window.__APP_CONFIG__?.apiUrl ?? '/api',
  storyDataUrl: window.__APP_CONFIG__?.storyDataUrl ?? '/assets/data/test-story.json',
  supabaseUrl: window.__APP_CONFIG__?.supabaseUrl ?? '',
  supabasePublishableKey: window.__APP_CONFIG__?.supabasePublishableKey ?? '',
};
