/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly MAIN_VITE_USER_DATA_PATH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
