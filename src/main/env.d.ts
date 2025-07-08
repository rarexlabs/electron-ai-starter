/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly MAIN_VITE_DB_FOLDER?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
