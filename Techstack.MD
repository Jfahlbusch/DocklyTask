# DocklyTask – Techstack Übersicht

> Diese Datei dient als Referenz für den verwendeten Techstack und kann als Prompt-Vorlage genutzt werden.

---

## 🚀 Framework & Runtime

| Technologie | Version | Beschreibung |
|-------------|---------|--------------|
| **Next.js** | 15.3.5 | React-Framework mit App Router (RSC enabled) |
| **React** | 19.0.0 | UI-Bibliothek mit Server Components |
| **TypeScript** | ^5 | Typsichere Entwicklung |
| **Node.js** | – | Runtime-Umgebung |

---

## 🔐 Authentifizierung

| Technologie | Version | Beschreibung |
|-------------|---------|--------------|
| **NextAuth.js** | ^4.24.11 | Authentifizierungs-Framework für Next.js |
| **Keycloak.js** | ^26.2.0 | Identity & Access Management Integration |

---

## 🗄️ Datenbank & ORM

| Technologie | Version | Beschreibung |
|-------------|---------|--------------|
| **Prisma** | ^6.11.1 | Type-safe ORM für Node.js |
| **@prisma/client** | ^6.11.1 | Auto-generierter Datenbank-Client |
| **SQLite** | – | Datenbank-Provider (dev.db) |

---

## 🎨 Styling & UI

| Technologie | Version | Beschreibung |
|-------------|---------|--------------|
| **Tailwind CSS** | ^4 | Utility-first CSS Framework |
| **tailwind-merge** | ^3.3.1 | Tailwind-Klassen intelligent zusammenführen |
| **clsx** | ^2.1.1 | Conditional className Utility |
| **class-variance-authority** | – | Variant-basierte Komponenten-Styling |
| **tailwindcss-animate** | – | Animation-Utilities für Tailwind |
| **tw-animate-css** | – | CSS-Animationen für Tailwind |

### UI Component Library

| Technologie | Style | Beschreibung |
|-------------|-------|--------------|
| **shadcn/ui** | new-york | Kopierbare UI-Komponenten basierend auf Radix |
| **Radix UI** | – | Primitive headless UI-Komponenten |
| **Lucide React** | ^0.525.0 | Icon-Bibliothek |

#### Verwendete Radix UI Komponenten:
- Accordion, Alert Dialog, Aspect Ratio, Avatar
- Checkbox, Collapsible, Context Menu
- Dialog, Dropdown Menu
- Hover Card, Label
- Menubar, Navigation Menu
- Popover, Progress
- Radio Group, Scroll Area, Select, Separator
- Slider, Slot, Switch
- Tabs, Toast, Toggle, Toggle Group, Tooltip

---

## 📝 Formulare & Validierung

| Technologie | Version | Beschreibung |
|-------------|---------|--------------|
| **React Hook Form** | ^7.62.0 | Performante Formular-Verwaltung |
| **Zod** | ^4.0.15 | Schema-Validierung mit TypeScript-Integration |
| **@hookform/resolvers** | ^5.2.1 | Resolver für React Hook Form (Zod etc.) |

---

## 🔄 State Management & Data Fetching

| Technologie | Version | Beschreibung |
|-------------|---------|--------------|
| **TanStack React Query** | ^5.82.0 | Server State Management & Caching |
| **TanStack React Table** | – | Headless Table-Komponente |
| **Zustand** | – | Lightweight State Management |

---

## 🌐 Echtzeit-Kommunikation

| Technologie | Version | Beschreibung |
|-------------|---------|--------------|
| **Socket.IO** | ^4.8.1 | WebSocket-Server |
| **Socket.IO Client** | ^4.8.1 | WebSocket-Client |

---

## 🎯 Drag & Drop

| Technologie | Beschreibung |
|-------------|--------------|
| **@dnd-kit/core** | Core Drag & Drop Primitives |
| **@dnd-kit/sortable** | Sortierbare Listen |
| **@dnd-kit/utilities** | Hilfsfunktionen |

---

## 📊 Visualisierung & Charts

| Technologie | Version | Beschreibung |
|-------------|---------|--------------|
| **Recharts** | ^2.15.4 | Deklarative Chart-Bibliothek |

---

## ⚙️ Utilities & Hilfsbibliotheken

| Technologie | Version | Beschreibung |
|-------------|---------|--------------|
| **date-fns** | ^4.1.0 | Datums-Manipulation |
| **uuid** | ^11.1.0 | UUID-Generierung |
| **axios** | – | HTTP-Client |
| **sharp** | – | Bildverarbeitung |
| **Framer Motion** | – | Animationen |
| **react-markdown** | – | Markdown-Rendering |
| **react-syntax-highlighter** | – | Code-Highlighting |
| **cmdk** | – | Command Palette (⌘K) |
| **sonner** | – | Toast Notifications |
| **vaul** | – | Drawer Component |
| **embla-carousel-react** | – | Carousel |
| **react-day-picker** | – | Datepicker |
| **react-resizable-panels** | – | Resizable Panels |
| **input-otp** | – | OTP-Input |
| **@mdxeditor/editor** | – | MDX Editor |
| **next-intl** | – | Internationalisierung |
| **next-themes** | – | Theme Switching (Dark/Light) |
| **@reactuses/core** | – | React Hooks Collection |

---

## 🧪 Development Tools

| Technologie | Version | Beschreibung |
|-------------|---------|--------------|
| **ESLint** | ^9 | Code Linting |
| **eslint-config-next** | 15.3.5 | Next.js ESLint-Konfiguration |
| **nodemon** | – | Dev Server Auto-Restart |
| **tsx** | – | TypeScript Execution |

---

## 📁 Projektstruktur

```
DocklyTask/
├── prisma/                 # Prisma Schema & Migrations
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── (app-layout)/   # Layout-Gruppen
│   │   ├── api/            # API Routes
│   │   └── ticket/         # Ticket-Seiten
│   ├── auth/               # Auth-Konfiguration
│   ├── components/         # React-Komponenten
│   │   ├── admin/
│   │   ├── customers/
│   │   ├── forms/
│   │   ├── layout/
│   │   ├── shared/
│   │   └── ui/             # shadcn/ui Komponenten
│   ├── hooks/              # Custom React Hooks
│   ├── integrations/       # Externe Integrationen (z.B. Pipedrive)
│   └── lib/                # Utilities & Konfiguration
├── public/                 # Statische Assets
└── server.ts               # Custom Server (Socket.IO)
```

---

## 🔧 Konfigurationsdateien

| Datei | Beschreibung |
|-------|--------------|
| `next.config.ts` | Next.js Konfiguration |
| `tailwind.config.ts` | Tailwind CSS Konfiguration |
| `tsconfig.json` | TypeScript Konfiguration |
| `components.json` | shadcn/ui Konfiguration |
| `eslint.config.mjs` | ESLint Konfiguration |
| `prisma/schema.prisma` | Datenbank-Schema |

---

## 📋 Prompt-Vorlage für AI-Assistenten

```
Dieses Projekt verwendet folgenden Techstack:

**Framework:** Next.js 15.3.5 mit App Router und React 19 (Server Components)
**Sprache:** TypeScript 5
**Styling:** Tailwind CSS 4 mit shadcn/ui (new-york style) und Radix UI Primitives
**Icons:** Lucide React
**Datenbank:** SQLite mit Prisma ORM 6.11
**Auth:** NextAuth.js + Keycloak
**State:** TanStack React Query für Server State, Zustand für Client State
**Formulare:** React Hook Form + Zod Validierung
**Echtzeit:** Socket.IO für WebSocket-Kommunikation
**Drag & Drop:** @dnd-kit
**Charts:** Recharts

Wichtige Konventionen:
- Server Components sind Standard (RSC enabled)
- API Routes unter src/app/api/
- Komponenten in src/components/ organisiert
- UI-Komponenten von shadcn/ui in src/components/ui/
- Custom Hooks in src/hooks/
- Utilities in src/lib/
- Prisma-Client wird aus src/lib/db.ts exportiert
```

---

## 🔗 Relevante Links

- [Next.js Docs](https://nextjs.org/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Prisma](https://www.prisma.io/)
- [TanStack Query](https://tanstack.com/query)
- [React Hook Form](https://react-hook-form.com/)
- [Zod](https://zod.dev/)
- [Socket.IO](https://socket.io/)
- [dnd-kit](https://dndkit.com/)

