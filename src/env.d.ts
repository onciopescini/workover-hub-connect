/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_UI_THEME?: 'stitch' | 'classic';
  readonly VITE_POSTHOG_KEY?: string;
  readonly VITE_MAPBOX_TOKEN?: string;
  readonly VITE_GOOGLE_ANALYTICS_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
