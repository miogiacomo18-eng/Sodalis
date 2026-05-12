# SODALIS — Struttura completa del progetto

## Setup iniziale

```bash
# 1. Installa le dipendenze
npm install

# 2. Copia e compila le variabili d'ambiente
cp .env.example .env
# Apri .env e inserisci URL e ANON KEY del tuo progetto Supabase

# 3. Su Supabase Dashboard → SQL Editor, esegui in ordine:
#    sql/01_schema.sql
#    sql/02_seed.sql
#    sql/04_functions.sql
#    rls/03_rls.sql

# 4. Avvia in Expo Go
npx expo start
```

---

## Struttura file

```
sodalis/
├── app.json                          # Config Expo
├── package.json                      # Dipendenze
├── tsconfig.json                     # TypeScript strict
├── babel.config.js                   # Babel + Reanimated
├── .env.example                      # Template variabili ambiente
│
├── sql/
│   ├── 01_schema.sql                 # Schema completo Supabase
│   ├── 02_seed.sql                   # Dati di default (action_types, tribunal_categories)
│   └── 04_functions.sql              # Trigger profilo, join_group_by_invite, generate_invite_code
│
├── rls/
│   └── 03_rls.sql                    # RLS policies per tutte le tabelle
│
├── app/
│   ├── _layout.tsx                   # Root layout — auth guard, QueryClientProvider
│   ├── auth.tsx                      # Login + Registrazione
│   └── (app)/
│       ├── _layout.tsx               # Stack layout app autenticata
│       ├── profile.tsx               # Profilo utente + logout
│       └── groups/
│           ├── index.tsx             # Selezione gruppi
│           ├── new.tsx               # Crea gruppo (modal)
│           └── [id]/
│               ├── _layout.tsx       # Tab layout del gruppo (Home/Lore/Debiti/Serate)
│               ├── index.tsx         # Home gruppo — panoramica
│               ├── settings.tsx      # Impostazioni gruppo
│               ├── events/
│               │   ├── index.tsx     # Lista serate
│               │   ├── new.tsx       # Crea serata
│               │   └── [eventId]/
│               │       ├── index.tsx # Dettaglio serata
│               │       └── tribunal/
│               │           ├── index.tsx   # Votazioni tribunale
│               │           └── results.tsx # Risultati tribunale
│               ├── lore/
│               │   ├── index.tsx     # Feed lore
│               │   └── new.tsx       # Crea entry lore
│               ├── debts/
│               │   └── index.tsx     # Storico + bilancio debiti sociali
│               └── members/
│                   └── index.tsx     # Lista membri + statistiche
│
├── components/
│   └── ui/
│       ├── index.tsx                 # Button, Card, Avatar, EmptyState, ErrorState,
│       │                             # LoadingSpinner, Divider, Badge, SectionHeader, FAB
│       └── Input.tsx                 # Input component con label/error/hint
│
├── hooks/
│   └── index.ts                      # Tutti i React Query hooks + computeTribunalResults
│
├── lib/
│   ├── supabase.ts                   # Client Supabase con AsyncStorage
│   └── queryClient.ts               # QueryClient React Query configurato
│
├── store/
│   └── index.ts                      # Zustand: useAuthStore + useGroupStore
│
├── types/
│   └── index.ts                      # Tutti i TypeScript types (Profile, Group, Event, ...)
│
├── constants/
│   └── theme.ts                      # Colors, Spacing, Radius, FontSize, FontWeight,
│                                     # Shadow, GROUP_EMOJIS, LORE_EMOJIS
│
└── utils/
    └── index.ts                      # formatDate, formatRelative, getInitials,
                                      # generateInviteCode, truncate, pluralize
```

---

## Ordine di esecuzione SQL su Supabase

1. `sql/01_schema.sql` — crea enum, tabelle, indici, trigger updated_at
2. `sql/02_seed.sql` — inserisce action_types e tribunal_categories di default
3. `sql/04_functions.sql` — crea trigger auto-profilo, funzioni RPC
4. `rls/03_rls.sql` — abilita RLS e crea tutte le policies

---

## Note tecniche importanti

### Supabase Storage (foto lore)
Per le entry di tipo `photo`, nella v1 il campo `content` contiene
un URL esterno (es. Imgur, iCloud). Per abilitare upload diretto:
1. Crea bucket `lore-photos` in Supabase Storage
2. Usa `expo-image-picker` + `supabase.storage.from('lore-photos').upload(...)`
3. Salva il public URL nel campo `content`

### Expo Go compatibility
Tutte le librerie usate sono compatibili con Expo Go (SDK 51).
Non è richiesto nessun build nativo.

### Variabili d'ambiente
`EXPO_PUBLIC_*` — accessibili lato client in Expo.
Non inserire mai secrets o service role key nel client.

### React Query cache
- staleTime: 2 minuti — i dati si ricaricano dopo 2 min di inattività
- gcTime: 10 minuti — cache tenuta 10 min prima di essere eliminata
- Dopo ogni mutation, si invalida la query corrispondente

### Zustand
- `useAuthStore` — profilo utente corrente
- `useGroupStore` — gruppo attivo nella sessione corrente
Entrambi sono in-memory: si resettano al logout/restart.
