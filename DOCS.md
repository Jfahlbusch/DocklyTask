## DocklyTask – Funktions- und Feld-Dokumentation

Diese Datei beschreibt alle wesentlichen Bereiche der Anwendung, inklusive Features, Komponenten, API-Endpunkte, Datenmodelle und Authentifizierung.

### Inhaltsverzeichnis
- Authentifizierung und Sicherheit
- Datenmodelle (Prisma)
- Zustands- und Kontext-Management
- Zentrale UI-Elemente (Layout, Header, Sidebar)
- Kernkomponenten (TaskDetailView, TaskChat, NotificationCenter)
- Listen- und Board-Ansichten (Dashboard, KanbanBoard, QuickUserFilter)
- UI-Bausteine (DropdownSelect, DatePickerSelect, Calendar)
- API-Endpunkte (Überblick)
- Ticket-Ansicht
- Seed-/Demo-Daten

---

## Authentifizierung und Sicherheit

- Provider: Keycloak (OIDC), integriert über NextAuth.js (Authorization Code Flow mit Client-Secret)
- Konfiguration (ENV-Auszug):
  - KEYCLOAK_ISSUER: `https://KEYCLOAK/realms/REALM`
  - KEYCLOAK_CLIENT_ID / KEYCLOAK_CLIENT_SECRET
  - NEXTAUTH_SECRET, NEXTAUTH_URL
- Endnutzer-Login: `/api/auth/signin/keycloak`
- Callback-URL: `/api/auth/callback/keycloak`
- Middlewares (`src/middleware.ts`):
  - schützt alle Routen außer Auth-, Next-Assets, `/public` und `/denied` sowie Root `/`
  - tenant-basierte Prüfung via `use_docklytask`/`manage_docklytask` oder `global_admin`
  - Dev-Schonfall: Tenant `local` erlaubt in Nicht-Production
- Rollen-/Claim-Mapping: `global_admin` → Admin in lokaler DB; Tenants aus `use_docklytask`/`manage_docklytask`, `resource_access`, `groups` und optionalen `extra/attributes` Feldern
- Kundenableitung (Customer):
  - aus Claims (`extra.customer`, `attributes.customer`), `groups` (z. B. `/customers/ACME`), Fallback aus E-Mail-Domain, oder eindeutigem Tenant
  - legt Kunden bei Bedarf an und verknüpft User (`customerId`)

## Datenmodelle (Prisma)

Wesentliche Modelle (Auszug mit Feldern):

- User
  - id, email, name?, phone?, avatar?, role (ADMIN|MANAGER|USER|VIEWER), customerId?
  - Relationen: assignedTasks, createdTasks, assignedSubTasks, customer, projectAssignees, comments, chatMessages, customerChatMessages, teamMemberships

- Customer
  - id, name, tenantId?, mainContact?, info?
  - Relationen: users, projects, tasks

- Project
  - id, name, description?, status, goLiveDate?, customerId
  - Relationen: customer, tasks, assignees, products, templates

- Task
  - id, taskNumber(Int, eindeutig), title, description?, status, statusId?, priority(LOW|MEDIUM|HIGH|URGENT)
  - startDate?, dueDate?, customerId?, projectId?, categoryId?, assigneeId?, teamId?, isCustomerVisible(Boolean, default false)
  - createdById, createdAt, updatedAt
  - Relationen: customer, project, category, assignee, team, createdBy, taskStatus, subtasks, attachments, comments, chatMessages, customerChatMessages

- TaskStatus
  - id, name, label, description?, color, order, isActive

- SubTask
  - id, title, description?, priority, status, assigneeId?, teamId?, taskId

- TaskAttachment / CommentAttachment
  - id, fileName, fileSize?, fileType?, fileUrl, parentId, createdAt

- TaskChatMessage / TaskCustomerChatMessage
  - id, content, taskId, userId, timestamps

- Team, TeamMember, Category, Product, ProjectTemplate (+ TemplateTask/TemplateProduct), RolePermission, AppConfiguration

## Zustands- und Kontext-Management

- `TaskProvider` (`src/hooks/useTaskContext.tsx`)
  - Lädt: tasks, users, projects, customers, categories, teams, taskStatuses
  - Methoden:
    - `updateTask(taskId, updates)` – PUT `/api/tasks/[id]`, inkl. Revalidation
    - `deleteTask(taskId)` – DELETE `/api/tasks/[id]`
    - `addTask(task)` – POST `/api/tasks`, enrich + Revalidation
    - Subtasks: `updateSubtask`, `addSubtask`, `deleteSubtask`
    - Kommentare: `addComment`, `updateComment`, `deleteComment`
    - Anhänge: `addAttachment`, `deleteAttachment`, `addCommentAttachment`, `deleteCommentAttachment`
    - `refreshData()` – re-fetch aller Stammdaten

- `AuthProvider` (`src/auth/AuthProvider.tsx`)
  - Exponiert: `ready`, `authenticated`, `token`, `profile`, `claims`, `tenant`, `hasRole`, `accessGranted`, `login`, `logout`, `getToken`

- `Protected` (`src/auth/Protected.tsx`)
  - Redirect bei fehlender Auth; `/denied` bei fehlenden Rechten

## Zentrale UI-Elemente

- Header (`src/components/layout/Header.tsx`)
  - Link-Brand: DocklyTask, Seiten-Titel abhängig vom Pfad
  - Suchfeld, NotificationCenter, User-Menü (Profil, Admin, Abmelden)

- Sidebar (`src/components/layout/AppSidebar.tsx`)
  - Zusammenklappbar, Branding, Navigation mit aktiver Markierung

## Kernkomponenten

### TaskDetailView (`src/components/shared/TaskDetailView.tsx`)

- Modi: `renderMode='popup' | 'inline'`
- Props (Auszug): `task`, `taskStatuses`, `users`, `teams`, `projects?`, `customers?`, CRUD-Handler, `currentUser`, `refreshData`, `open`, `onOpenChange`, `defaultExpandAll?`
- Header:
  - Ticket-ID klickbar (neuer Tab `/ticket/[taskNo]`)
  - Beobachten-Button (Watch): lokale Watchlist pro Nutzer (localStorage)
  - Beobachter-Verwaltung: weitere Nutzer hinzufügen/entfernen (localStorage-basiert)
  - Schloss (nur Admin/Manager): Kundensichtbarkeit toggeln (`isCustomerVisible`)
  - Inline-Modus: „Details anzeigen/ausblenden“ (Standard: eingeklappt)
- Meta-/Steuerzeile:
  - Projektauswahl (DropdownSelect) – aktualisiert `projectId`
  - Kundenauswahl (DropdownSelect) – aktualisiert `customerId`
  - Beschreibung (RichText, editierbar, Mentions `@name` → NotificationEvent)
  - Status (DropdownSelect, farbig), Priorität, Kategorie, Assignee (mit Avatar), Team
  - Datum: Start/Fällig (DatePickerSelect, Variante „modal“ im Popup)
  - Badges: Unteraufgabenanzahl, Anhängeanzahl, Chat-Zähler (intern/extern)
- Bereiche:
  - Unteraufgaben (Liste, Toggle Complete, Edit/Delete, Priorität/Assignee/Team als Dropdowns, Formular-Dialog)
  - Anhänge (einklappbar, Standard: je nach `defaultExpandAll`; Zähler-Badge im Header)
  - Interner Chat (für Admin/Manager), Kundenchat (immer sichtbar)
- Benachrichtigungen (NotificationCenter Events via `window.dispatchEvent('notifications:push')`):
  - Status- und Prioritätsänderungen, neue Kommentare, (Unter-)Aufgaben-Zuweisungen
  - Mentions in Beschreibung
  - Link `href` bevorzugt `/?view=kanban&taskNo=<nr>`

### TaskChat (`src/components/shared/TaskChat.tsx`)

- Modi: `internal` (nur Personal) und `customer`
- Features:
  - Live-Chat via Socket-Räume (join/leave), inkrementelles Laden
  - Textmodus und Rich-Text-Composer (umschaltbar)
  - Emojis, GIF-Suche (GIPHY, optionaler API-Key), Editieren/Löschen eigener Nachrichten
  - Mentions im Textmodus: `@`-Erkennung, Vorschlagsliste (unter Caret, per Portal), Keyboard-Navigation
  - Mentions → NotificationEvent mit Autor, Nachricht, Kunde, Ticket-Link
  - Hintergrundzählung (optional) meldet `onMessageCountChange`

### NotificationCenter (`src/components/shared/NotificationCenter.tsx`)

- Persistenz: `localStorage` (mit Revive der Datumswerte)
- Quellen:
  - Server-Events (Kommentare/Chats) via Sockets
  - Client-Events (assignments, mentions, watch) via `notifications:push`
- Funktionen:
  - Badge im Header (ungelesen), Liste mit Typ-Icons, Link zur Aufgabe, „Als gelesen“/„Leeren“

## Listen- und Board-Ansichten

### Dashboard (`src/components/Dashboard.tsx`)

- Gruppiert Aufgaben nach Projekt, zeigt jede Aufgabe als `TaskDetailView` im Inline-Modus (mit Rahmen)
- Globale Filter (Status, Priorität, Kategorie, Kunde, Fälligkeit, „Show Completed“)
- Schnellfilter (QuickUserFilter):
  - Buttons für Admin/Manager, andere Nutzer per Such-Dropdown
  - Filtert Aufgaben, in denen Nutzer direkt oder in Unteraufgaben zugeordnet ist

### KanbanBoard (`src/components/KanbanBoard.tsx`)

- Gruppieren nach: Status (dynamisch aus `TaskStatus`), Priorität, Assignee, Projekt
- Drag&Drop: setzt je nach Gruppierung `statusId`/`priority`/`assigneeId`/`projectId`
- Karten (KanbanCard):
  - Ticket-Nr. über dem Titel; Beschreibung (geclamped);
  - Meta-Chips (Priorität, Kategorie, Assignee, Anhänge, Kommentare, Due Date)
  - Unteraufgabenbereich (Standard einklappbar); Auto-Expand, wenn aktueller Nutzer Subtask-Assignee
  - Kontextmenü: Bearbeiten/Löschen
- Filter wie im Dashboard (Schnellfilter + globale Filter)

### QuickUserFilter (`src/components/shared/QuickUserFilter.tsx`)

- Admin/Manager als Buttons, andere Nutzer über DropdownSelect (mit Avatar)
- Prop `onChange` gibt `'all'` oder `userId` zurück
- Nutzt Initialen/Avatar, um Nutzer erkennbar darzustellen

## UI-Bausteine

### DropdownSelect (`src/components/ui/DropdownSelect.tsx`)

- Props: `items[{id,label,icon?,color?}]`, `selectedId?`, `onSelect(id)`, `searchable?`, `placeholder?`, `onOpenChange?`, Styling-Props
- Bedienung:
  - Menü relativ zum Trigger; DropUp-Logik, wenn zu wenig Platz
  - Korrekte Event-Handhabung in Dialogs (stopPropagation bei mousedown/click)
  - Suche im Menü (optional)

### DatePickerSelect (`src/components/ui/DatePickerSelect.tsx`) & Calendar (`src/components/ui/calendar.tsx`)

- Varianten: `inline`, `popover`, `modal` (für Popups empfohlen)
- Props: `selected`, `onSelect`, `label?`, `currentSelection` (setzt initialen Monat/Highlight)
- Calendar (DayPicker-basiert):
  - Monats-/Jahres-Dropdowns, Navigation, Fokus-Handhabung
  - Klassen/Styles für korrekte Anzeige in Popups (Z-Index etc.)

## API-Endpunkte (Überblick)

App-Router unter `src/app/api/*` (GET/POST/PUT/DELETE je nach Route):

- `/api/tasks` & `/api/tasks/[id]`
  - GET mit Filtern (StatusId, Priority, CustomerId, ProjectId, CategoryId, AssigneeId, TeamId, CreatedById, showCompleted)
  - POST: erstellt Task, generiert `taskNumber`, normalisiert FKs, setzt `status` aus `statusId`
  - PUT: Partial-Updates inkl. `isCustomerVisible`

- `/api/task-statuses`, `/api/subtasks`, `/api/comments`, `/api/task-attachments`, `/api/comment-attachments`
- `/api/users`, `/api/projects`, `/api/customers`, `/api/categories`, `/api/teams`
- Chat: `/api/chat-messages`, `/api/customer-chat-messages`
- Auth: `/api/auth/[...nextauth]`
- Health: `/api/health`
- Seed: `/api/seed`

## Ticket-Ansicht

- Route: `/ticket/[taskNo]`
- Darstellung: `TaskDetailView` im Inline-Modus, `defaultExpandAll=true`, mit voller Kontextversorgung via Layout-Wrapper

## Seed-/Demo-Daten

- `/api/seed`: legt Demo-User (inkl. rollierender Rollen) und Beispiel-Aufgaben (mit `taskNumber`) an

---

### Hinweise zur Benachrichtigung/„Watch“-Funktion

- Watchlist wird pro Nutzer in `localStorage` unter `taskwise:watchlist:<userId>` gepflegt
- Ereignisse (Status/Prio/Kommentar/Assign/Subtask/Mentions) erzeugen `notifications:push` Events
- NotificationCenter persistiert bis Nutzer löscht; Anzeige inkl. Link zur Aufgabe

### Barrierefreiheit & Verhalten in Popups

- Dialogs: `DialogTitle` vorhanden (visuell versteckt in Popup-Detailansicht)
- Dropdowns/Calendar: angepasstes Overflow/Z-Index/Event-Handling, damit Auswahl in Popups zuverlässig möglich ist


