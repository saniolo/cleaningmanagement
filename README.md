# Next.js Boilerplate

Stack: **Next.js 14 App Router** · **TypeScript** · **Tailwind CSS** · **NextAuth v4** · **Prisma**

## Setup

### 1. Installa le dipendenze

```bash
npm install
```

### 2. Configura le variabili d'ambiente

```bash
cp .env.example .env.local
```

Modifica `.env.local` con i tuoi valori:

- `DATABASE_URL` — stringa di connessione al DB (PostgreSQL o SQLite)
- `NEXTAUTH_SECRET` — genera con `openssl rand -base64 32`
- `NEXTAUTH_URL` — URL base (es. `http://localhost:3000`)
- Provider OAuth opzionali: `GITHUB_*`, `GOOGLE_*`

### 3. Setup database

```bash
# Per SQLite (sviluppo locale rapido), cambia in schema.prisma:
# provider = "sqlite"
# url = "file:./dev.db"

npm run db:push       # Sincronizza schema → DB (dev)
# oppure
npm run db:migrate    # Crea migration (produzione)

npm run db:generate   # Rigenera il Prisma Client
```

### 4. Avvia in sviluppo

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000)

---

## Struttura

```
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   └── dashboard/page.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   └── register/route.ts
│   ├── layout.tsx
│   ├── page.tsx
│   └── providers.tsx
├── lib/
│   ├── auth.ts        # Configurazione NextAuth
│   ├── prisma.ts      # Singleton Prisma Client
│   └── utils.ts       # Utility cn()
├── prisma/
│   └── schema.prisma  # Modello DB (User, Account, Session)
├── types/
│   └── next-auth.d.ts # Estensione tipi sessione
├── styles/
│   └── globals.css
└── middleware.ts      # Protezione route autenticate
```

## Script disponibili

| Comando | Descrizione |
|---|---|
| `npm run dev` | Avvia dev server |
| `npm run build` | Build produzione |
| `npm run db:push` | Aggiorna DB senza migration |
| `npm run db:migrate` | Crea e applica migration |
| `npm run db:studio` | Apre Prisma Studio |

## Route protette

Il middleware in `middleware.ts` protegge automaticamente `/dashboard/**` e `/admin/**`. Le route `/admin/**` richiedono `role === "ADMIN"`.
