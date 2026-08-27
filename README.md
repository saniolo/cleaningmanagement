# Gestione Pulizie — Cleaning Workforce Management

Piattaforma di gestione turni per un'azienda di pulizie. Vedi [`PROJECT_SPEC.md`](./PROJECT_SPEC.md) per la specifica completa e il piano approvato in `/.claude/plans/` per l'architettura di dettaglio.

Stack: **Next.js 14 App Router** · **TypeScript** · **Tailwind CSS** · **shadcn/ui** · **NextAuth (Auth.js) v4** · **Prisma** · **PostgreSQL**

Stato: **Milestone 6 — Assenze** completata. Login admin, route protette, CRUD Dipendenti/Clienti/Location/Servizi, ricorrenze e generazione attività, pianificazione settimanale admin con rilevamento conflitti, dashboard dipendente mobile-first, e il flusso assenze completo: richiesta dipendente (`/app/[token]/absences`) → coda di approvazione admin (`/admin/absences`) → impatto transazionale sulle attività già assegnate (tornano "da assegnare", mai eliminate). Sostituzioni arrivano nella milestone successiva, su approvazione.

## Setup

### 1. Installa le dipendenze

```bash
npm install
```

### 2. Configura le variabili d'ambiente

```bash
cp .env.example .env.local
cp .env.example .env   # il Prisma CLI legge solo .env, Next.js legge .env.local
```

Genera `NEXTAUTH_SECRET` con `openssl rand -base64 32` (va solo in `.env.local`).

### 3. Avvia il database (Postgres locale via Docker)

```bash
docker compose up -d
npm run db:migrate     # applica le migration
npm run db:generate    # rigenera il Prisma Client
npm run db:seed        # crea azienda demo, utente admin e un dipendente di prova
```

Il seed stampa le credenziali admin (default `admin@example.com` / `changeme123`,
sovrascrivibili con `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`) e il link personale
del dipendente di prova.

### 4. Avvia in sviluppo

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000)

---

## Struttura

```
├── app/
│   ├── (auth)/login/          Login admin (NextAuth credentials)
│   ├── admin/                 Area amministratore (protetta da middleware, ruolo ADMIN)
│   │   ├── planning/          Pianificazione settimanale
│   │   ├── employees/         Dipendenti
│   │   ├── customers/         Clienti / location / servizi
│   │   ├── absences/          Assenze
│   │   ├── unassigned/        Attività da assegnare
│   │   └── settings/
│   ├── app/[token]/           Dashboard dipendente — link personale, nessun login
│   │   ├── replacements/
│   │   ├── absences/
│   │   └── profile/
│   └── api/auth/[...nextauth]/
├── components/
│   ├── ui/                    shadcn/ui (Radix + Tailwind v3)
│   ├── admin/                 Nav e componenti area admin
│   ├── employee/              Nav e componenti area dipendente
│   └── shared/                PageHeader, EmptyState, ecc.
├── lib/
│   ├── auth/                  Configurazione NextAuth (solo ADMIN, no OAuth)
│   ├── db/                    Prisma Client singleton
│   └── dates/                 Timezone centralizzato (Europe/Rome)
├── prisma/
│   └── schema.prisma          Modello di dominio completo
├── styles/globals.css
└── middleware.ts              Protegge /admin/** (richiede sessione ADMIN)
```

## Accesso dipendenti

I dipendenti **non hanno login** in questa fase: ogni dipendente ha un link personale `/app/[token]` con un token non indovinabile generato server-side. Il login dipendente reale è pianificato per una milestone futura, su richiesta esplicita.

## Script disponibili

| Comando              | Descrizione              |
| -------------------- | ------------------------ |
| `npm run dev`        | Avvia dev server         |
| `npm run build`      | Build produzione         |
| `npm run lint`       | ESLint                   |
| `npm run typecheck`  | Type-check TypeScript    |
| `npm run format`     | Formatta con Prettier    |
| `npm run db:migrate` | Crea e applica migration |
| `npm run db:studio`  | Apre Prisma Studio       |

## Route protette

`middleware.ts` protegge `/admin/**`, richiedendo una sessione con `role === "ADMIN"`. `/app/[token]/**` non richiede sessione: l'identità viene risolta dal token nell'URL lato server (`lib/permissions/employee.ts`), con 404 generico se il token non è valido o il dipendente è disattivato.
