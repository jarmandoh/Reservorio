declare global {
  interface Window {
    __APP_CONFIG__?: {
      apiUrl?: string;
      storyDataUrl?: string;
    };
  }
}

export const environment = {
  production: true,
  apiUrl: window.__APP_CONFIG__?.apiUrl ?? '/api',
  storyDataUrl: window.__APP_CONFIG__?.storyDataUrl ?? '/assets/data/test-story.json',
};
