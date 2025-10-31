/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_UI_THEME?: 'stitch' | 'classic';
  readonly VITE_POSTHOG_KEY?: string;
  readonly VITE_MAPBOX_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
