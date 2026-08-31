declare global {
  interface Window {
    __APP_CONFIG__?: {
      apiUrl?: string;
    };
  }
}

export const environment = {
  production: true,
  apiUrl: window.__APP_CONFIG__?.apiUrl ?? '/api',
};
