# Gestione Pulizie — Cleaning Workforce Management

Piattaforma di gestione turni per un'azienda di pulizie. Vedi [`PROJECT_SPEC.md`](./PROJECT_SPEC.md) per la specifica completa e il piano approvato in `/.claude/plans/` per l'architettura di dettaglio.

Stack: **Next.js 14 App Router** · **TypeScript** · **Tailwind CSS** · **shadcn/ui** · **NextAuth (Auth.js) v4** · **Prisma** · **PostgreSQL**

Stato: **Milestone 9 — Produzione** in corso. Tutte le funzionalità core dell'MVP (M0–M8) sono implementate, testate e verificate. Questa sezione copre cosa serve per portare l'app in produzione: la parte codice/documentazione è pronta, il deploy vero e proprio richiede un account Vercel e un database Postgres gestito (Neon o equivalente) — vedi [Deploy in produzione](#deploy-in-produzione).

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
│   │   └── absences/          Assenze
│   ├── app/[token]/           Dashboard dipendente — link personale, nessun login
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

## Test automatici

I test (Vitest) girano contro un **database Postgres separato** (`cleaning_management_test`),
sullo stesso container Docker del DB di sviluppo — non toccano mai i dati di dev/demo.

```bash
cp .env.example .env.test.local   # poi correggi DATABASE_URL con il nome _test
npm test                          # crea/migra il DB di test e lancia i test una tantum
npm run test:watch                # modalità watch
```

Copre esattamente le priorità di PROJECT_SPEC.md sezione 32: isolamento tra dipendenti
e tra aziende, rilevamento conflitti, impatto delle assenze approvate, il meccanismo
unificato "Richiede conferma" (incluso un test di concorrenza reale — due `confirmAssignment`
simultanei sulla stessa attività, verificando che ne vinca esattamente uno), e idempotenza
della generazione ricorrenze.

## Script disponibili

| Comando              | Descrizione                  |
| -------------------- | ---------------------------- |
| `npm run dev`        | Avvia dev server             |
| `npm run build`      | Build produzione             |
| `npm run lint`       | ESLint                       |
| `npm run typecheck`  | Type-check TypeScript        |
| `npm run format`     | Formatta con Prettier        |
| `npm test`           | Esegue i test automatici     |
| `npm run test:watch` | Test in modalità watch       |
| `npm run db:migrate` | Crea e applica migration     |
| `npm run db:seed`    | Popola il DB con i dati demo |
| `npm run db:studio`  | Apre Prisma Studio           |

## Route protette

`middleware.ts` protegge `/admin/**`, richiedendo una sessione con `role === "ADMIN"`. `/app/[token]/**` non richiede sessione: l'identità viene risolta dal token nell'URL lato server (`lib/permissions/employee.ts`), con 404 generico se il token non è valido o il dipendente è disattivato.

## Deploy in produzione

Target consigliato: **Vercel** (app) + **Neon** o altro Postgres gestito standard (nessuna
dipendenza proprietaria oltre a questo). Questi passi richiedono un account Vercel e un
progetto Postgres già creati — non è qualcosa che si automatizza da qui.

### 1. Database di produzione

Crea un progetto Postgres (es. su Neon). Avrai due connection string:

- una **pooled** (via PgBouncer) → va in `DATABASE_URL`, usata dall'app a runtime
- una **diretta** (non pooled) → va in `DIRECT_URL`, usata solo per le migration

(Su Neon: dashboard → Connection Details → entrambe le varianti sono lì. In locale, dove
non c'è pooler, le due variabili puntano allo stesso Postgres via Docker.)

### 2. Variabili d'ambiente (da impostare su Vercel)

| Variabile         | Note                                                                                                                        |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`    | Connection string **pooled** del Postgres di produzione                                                                     |
| `DIRECT_URL`      | Connection string **diretta**, solo per le migration                                                                        |
| `NEXTAUTH_URL`    | URL pubblico dell'app (es. `https://tuodominio.it`)                                                                         |
| `NEXTAUTH_SECRET` | **Nuovo** secret, mai lo stesso di dev/test — genera con `openssl rand -base64 32`                                          |
| `CRON_SECRET`     | Genera con `openssl rand -base64 32`; deve combaciare con quanto Vercel Cron invia (automatico se la variabile è impostata) |

### 3. Migration

Prima del primo deploy (o dopo ogni cambio allo schema), applica le migration al DB di
produzione **manualmente**, non come parte automatica della build (per un servizio con
un solo tenant non ha senso rischiare una migration a ogni deploy):

```bash
DATABASE_URL="<pooled>" DIRECT_URL="<diretta>" npx prisma migrate deploy
```

### 4. Primo admin (bootstrap, non il seed demo)

**Non usare `npm run db:seed` in produzione** — crea dati fittizi (`Condominio Verdi`,
`Mario Rossi`, ecc.) pensati solo per lo sviluppo. Per il primo admin reale:

```bash
BOOTSTRAP_COMPANY_NAME="Nome Azienda Reale" \
BOOTSTRAP_ADMIN_EMAIL="admin@tuaazienda.it" \
BOOTSTRAP_ADMIN_PASSWORD="<password forte, min 12 caratteri>" \
DATABASE_URL="<pooled>" \
npx tsx prisma/bootstrap-production.ts
```

Idempotente: se l'email esiste già non fa nulla, quindi rieseguirlo per errore è
innocuo. Non crea dipendenti/clienti/servizi — quelli si inseriscono dall'app.

### 5. Deploy

Collega il repository a Vercel (o `vercel --prod` da CLI se già autenticato) con le
variabili del punto 2 impostate. `npm run build` include `prisma generate` come
`postinstall`, quindi il Prisma Client è sempre rigenerato a ogni build — non serve
altro nel build command.

`vercel.json` include già il cron giornaliero (03:00) che tiene popolato l'orizzonte di
pianificazione di 8 settimane (`/api/cron/generate-assignments`, protetto da `CRON_SECRET`).

### 6. Smoke test dopo il deploy

- [ ] `/login` carica e il login con l'admin da bootstrap funziona
- [ ] `/admin` mostra la dashboard senza errori
- [ ] Crea un cliente → location → servizio → ricorrenza dall'app
- [ ] `/admin/planning` mostra la griglia settimanale (le attività datate della ricorrenza appena creata compaiono da sole, senza bisogno di un trigger manuale)
- [ ] Crea un dipendente, copia il link personale, apri `/app/[token]` in incognito → dashboard mobile visibile
- [ ] Un token inventato su `/app/qualcosa-a-caso` → 404 (non deve mai restituire dati)
- [ ] Richiedi un'assenza da `/app/[token]/absences`, approvala da `/admin/absences`, verifica che l'attività coinvolta torni "da assegnare"

### Backup

Neon (e la maggior parte dei provider Postgres gestiti standard) offre point-in-time
recovery automatico sui piani a pagamento — verificalo nella dashboard del provider
scelto. In alternativa, programma un `pg_dump` periodico verso uno storage esterno.
Nessun meccanismo di backup applicativo è implementato in questa MVP (fuori scope, non
richiesto esplicitamente).

### Monitoraggio

Nessuno strumento di monitoring dedicato è stato integrato (fuori scope MVP). I log di
Vercel (Runtime Logs) coprono errori delle Server Action e delle route API; per
qualcosa di più strutturato (alerting, error tracking) valuta un servizio esterno
quando l'uso reale lo giustificherà.

---

**FUTURE IMPROVEMENT**
Descrizione: applicare davvero `User.mustChangePassword` — il campo esiste nello
schema ma nessun flusso lo controlla (né al login, né altrove); un admin creato via
bootstrap o seed può continuare a usare la password iniziale indefinitamente.
Valore di business: riduce il rischio di password deboli/condivise rimaste tali dal
primo setup.
Complessità stimata: BASSA — un controllo in più nel login flow + una pagina di cambio
password.
