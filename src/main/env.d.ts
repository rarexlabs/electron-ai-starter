/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly MAIN_VITE_USER_DATA_PATH?: string
  readonly DEV: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare namespace NodeJS {
  interface ProcessEnv {
    readonly NODE_ENV: 'development' | 'production' | 'test'
    readonly DB_PATH?: string
    readonly LOG_FOLDER?: string
  }
}
