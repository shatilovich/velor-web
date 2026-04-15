/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_WEB_PUSH_PUBLIC_KEY?: string
  readonly VITE_WEB_PUSH_SYNC_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
