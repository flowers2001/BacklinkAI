/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AZURE_API_KEY?: string
  readonly VITE_AZURE_ENDPOINT?: string
  readonly VITE_AZURE_DEPLOYMENT?: string
  readonly VITE_AZURE_API_VERSION?: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_GOOGLE_CLIENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
