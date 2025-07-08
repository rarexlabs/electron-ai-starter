/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly MAIN_VITE_DB_PATH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
