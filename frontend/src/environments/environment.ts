declare global {
  interface Window {
    __APP_CONFIG__?: {
      apiUrl?: string;
      storyDataUrl?: string;
    };
  }
}

export const environment = {
  production: false,
  apiUrl: window.__APP_CONFIG__?.apiUrl ?? 'http://localhost:3000/api',
  storyDataUrl: window.__APP_CONFIG__?.storyDataUrl ?? '/assets/data/test-story.json',
};
