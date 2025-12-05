# Migration: SQLite → PostgreSQL

> Migrationsplan für DocklyTask

---

## Übersicht

Diese Anleitung beschreibt die Migration von SQLite zu PostgreSQL für das DocklyTask-Projekt mit Prisma ORM.

**Voraussetzungen:**
- PostgreSQL Server (lokal oder remote)
- Zugang zur PostgreSQL-Datenbank
- Backup der bestehenden SQLite-Datenbank (`dev.db`)

---

## Phase 1: PostgreSQL einrichten

### 1.1 PostgreSQL installieren (falls nicht vorhanden)

**macOS (Homebrew):**
```bash
brew install postgresql@16
brew services start postgresql@16
```

**Docker (Alternative):**
```bash
docker run --name docklytask-postgres \
  -e POSTGRES_USER=docklytask \
  -e POSTGRES_PASSWORD=dein_sicheres_passwort \
  -e POSTGRES_DB=docklytask \
  -p 5432:5432 \
  -d postgres:16
```

### 1.2 Datenbank und Benutzer erstellen

```sql
-- Mit psql verbinden
psql postgres

-- Benutzer erstellen
CREATE USER docklytask WITH PASSWORD 'dein_sicheres_passwort';

-- Datenbank erstellen
CREATE DATABASE docklytask OWNER docklytask;

-- Berechtigungen setzen
GRANT ALL PRIVILEGES ON DATABASE docklytask TO docklytask;

-- Verbindung testen
\c docklytask
```

---

## Phase 2: Prisma konfigurieren

### 2.1 Environment-Variable anpassen

**.env** aktualisieren:
```env
# Alt (SQLite)
# DATABASE_URL="file:./dev.db"

# Neu (PostgreSQL)
DATABASE_URL="postgresql://docklytask:dein_sicheres_passwort@localhost:5432/docklytask?schema=public"
```

**Aufbau der Connection URL:**
```
postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]?schema=[SCHEMA]
```

### 2.2 Prisma Schema anpassen

**prisma/schema.prisma** – Provider ändern:

```prisma
datasource db {
  provider = "postgresql"  // War: "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// Rest des Schemas...
```

### 2.3 SQLite-spezifische Typen anpassen

Einige Datentypen verhalten sich unterschiedlich. Prüfe und passe ggf. an:

| SQLite | PostgreSQL | Anpassung nötig? |
|--------|------------|------------------|
| `String` | `String` | Nein |
| `Int` | `Int` | Nein |
| `Boolean` | `Boolean` | Nein |
| `DateTime` | `DateTime` | Nein |
| `Float` | `Float` | Nein |
| `Json` | `Json` | ✅ Natives JSON in PostgreSQL |
| `Bytes` | `Bytes` | Nein |

**PostgreSQL-spezifische Features nutzen (optional):**

```prisma
model Example {
  id        String   @id @default(uuid()) @db.Uuid  // Native UUID
  data      Json     @db.JsonB                      // JSONB für bessere Performance
  tags      String[] @default([])                   // Native Arrays
  createdAt DateTime @default(now()) @db.Timestamptz
}
```

---

## Phase 3: Datenmigration

### Option A: Nur Schema migrieren (empfohlen für Development)

Falls keine wichtigen Daten in der SQLite-DB sind:

```bash
# Prisma Client neu generieren
npx prisma generate

# Neue Migration erstellen und anwenden
npx prisma migrate dev --name init_postgresql

# Optional: Seed-Daten einspielen
npx prisma db seed
```

### Option B: Daten aus SQLite übernehmen

#### Schritt 1: Daten aus SQLite exportieren

```bash
# SQLite-Daten als JSON exportieren
npx prisma db execute --file export-data.sql --schema prisma/schema.prisma
```

Oder manuell mit einem Script:

**scripts/export-sqlite.ts:**
```typescript
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function exportData() {
  // Alle Tabellen exportieren
  const users = await prisma.user.findMany();
  const tickets = await prisma.ticket.findMany();
  // ... weitere Tabellen

  const data = {
    users,
    tickets,
    // ... weitere Tabellen
  };

  fs.writeFileSync('backup/sqlite-export.json', JSON.stringify(data, null, 2));
  console.log('Export abgeschlossen!');
}

exportData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

```bash
# Export ausführen (vor Schema-Änderung!)
npx tsx scripts/export-sqlite.ts
```

#### Schritt 2: Schema auf PostgreSQL umstellen

```bash
# .env anpassen (siehe 2.1)
# schema.prisma anpassen (siehe 2.2)

# Migration erstellen
npx prisma migrate dev --name switch_to_postgresql
```

#### Schritt 3: Daten in PostgreSQL importieren

**scripts/import-postgresql.ts:**
```typescript
import { PrismaClient } from '@prisma/client';
import data from '../backup/sqlite-export.json';

const prisma = new PrismaClient();

async function importData() {
  // Reihenfolge beachten (Foreign Keys!)
  
  // 1. Unabhängige Tabellen zuerst
  for (const user of data.users) {
    await prisma.user.create({ data: user });
  }

  // 2. Abhängige Tabellen danach
  for (const ticket of data.tickets) {
    await prisma.ticket.create({ data: ticket });
  }

  // ... weitere Tabellen

  console.log('Import abgeschlossen!');
}

importData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

```bash
npx tsx scripts/import-postgresql.ts
```

---

## Phase 4: Anpassungen im Code

### 4.1 Prisma Client neu generieren

```bash
npx prisma generate
```

### 4.2 Transaktionen prüfen

PostgreSQL unterstützt erweiterte Transaktionsoptionen:

```typescript
// Isolationslevel setzen (optional)
await prisma.$transaction(
  async (tx) => {
    // Operationen
  },
  {
    isolationLevel: 'Serializable', // PostgreSQL-spezifisch
  }
);
```

### 4.3 Raw Queries anpassen

Falls du Raw SQL verwendest, prüfe die Syntax:

```typescript
// SQLite
// await prisma.$queryRaw`SELECT datetime('now')`;

// PostgreSQL
await prisma.$queryRaw`SELECT NOW()`;
```

---

## Phase 5: Deployment

### 5.1 Production-Umgebung vorbereiten

```bash
# Migrations auf Production anwenden
npx prisma migrate deploy

# Prisma Client generieren
npx prisma generate
```

### 5.2 Connection Pooling (empfohlen)

Für Production mit vielen Verbindungen:

**.env (Production):**
```env
DATABASE_URL="postgresql://user:password@host:5432/db?schema=public&connection_limit=5"
```

Oder mit externem Pooler (PgBouncer, Supabase, Neon):
```env
DATABASE_URL="postgresql://user:password@pooler-host:6543/db?pgbouncer=true"
```

---

## Checkliste

- [ ] PostgreSQL installiert und läuft
- [ ] Datenbank und Benutzer erstellt
- [ ] `.env` mit neuer `DATABASE_URL` aktualisiert
- [ ] `schema.prisma` Provider auf `postgresql` geändert
- [ ] SQLite-Daten exportiert (falls benötigt)
- [ ] `npx prisma generate` ausgeführt
- [ ] `npx prisma migrate dev` ausgeführt
- [ ] Daten importiert (falls benötigt)
- [ ] Anwendung getestet
- [ ] Raw Queries auf PostgreSQL-Syntax geprüft
- [ ] Alte `dev.db` archiviert/gelöscht

---

## Häufige Probleme

### Fehler: "relation does not exist"
→ Migration wurde nicht ausgeführt: `npx prisma migrate dev`

### Fehler: "permission denied"
→ Datenbankbenutzer hat keine Rechte: `GRANT ALL PRIVILEGES ON DATABASE docklytask TO docklytask;`

### Fehler: "connection refused"
→ PostgreSQL läuft nicht oder Port ist falsch

### Fehler bei Auto-Increment IDs
SQLite verwendet `AUTOINCREMENT`, PostgreSQL `SERIAL`. Prisma handhabt das automatisch, aber bei manuellen Imports:
```sql
-- Sequenz zurücksetzen nach manuellem Import
SELECT setval('tablename_id_seq', (SELECT MAX(id) FROM tablename));
```

---

## Nützliche Befehle

```bash
# Prisma Studio (Datenbank-GUI)
npx prisma studio

# Schema validieren
npx prisma validate

# Schema formatieren
npx prisma format

# Datenbank zurücksetzen (ACHTUNG: löscht alle Daten!)
npx prisma migrate reset

# Status der Migrations prüfen
npx prisma migrate status
```
