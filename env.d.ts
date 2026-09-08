// Vite statically replaces literal `import.meta.env.VITE_*` member expressions.
// Declaring the shape here keeps those literals type-safe without indirection.
// env is declared non-optional on purpose: runtimes without it (node tests)
// throw on access, which services/cloudConfig.ts catches explicitly.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
