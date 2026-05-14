// ⚠️ QUESTO FILE VA RIGENERATO con il tuo schema reale!
// Esegui dal terminale nella root del progetto:
//
//   $env:SUPABASE_ACCESS_TOKEN="sbp_il_tuo_token"
//   npx supabase gen types typescript --project-id IL_TUO_PROJECT_ID --schema public > types/database.ts
//
// Il file qui sotto è un placeholder vuoto che permette al progetto di compilare.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
