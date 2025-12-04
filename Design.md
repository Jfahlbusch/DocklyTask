# Design System & Entwicklungsrichtlinien

Dieses Dokument enthält alle Designregeln und Konventionen für das DocklyTask-Projekt. Neue Ansichten und Komponenten müssen diesen Richtlinien folgen.

---

## 📁 Projektstruktur

```
src/
├── app/
│   ├── (app-layout)/          # Seiten mit Sidebar/Header Layout
│   │   ├── layout.tsx         # ⚠️ Gemeinsames Layout - NICHT in Seiten importieren!
│   │   ├── page.tsx           # Dashboard
│   │   ├── admin/
│   │   ├── categories/
│   │   ├── customers/
│   │   ├── products/
│   │   ├── profile/
│   │   ├── projects/
│   │   └── ...
│   ├── api/                   # API Routes
│   └── globals.css            # Globale Styles & CSS Variables
├── components/
│   ├── ui/                    # Wiederverwendbare UI-Komponenten (shadcn/ui)
│   ├── layout/                # Layout-Komponenten (Header, Sidebar)
│   ├── forms/                 # Formular-Komponenten
│   └── shared/                # Geteilte Business-Komponenten
├── hooks/                     # Custom React Hooks
└── lib/                       # Utilities & Types
```

---

## 🚨 Wichtigste Regel: Kein `AppLayout` Import in Seiten!

**NIEMALS** `AppLayout` in Seiten innerhalb von `(app-layout)/` importieren oder verwenden!

```tsx
// ❌ FALSCH - Verursacht doppeltes Layout und verschobenen Content
import AppLayout from '@/app/(app-layout)/layout';

export default function MyPage() {
  return (
    <AppLayout>
      <div>...</div>
    </AppLayout>
  );
}

// ✅ RICHTIG - Layout wird automatisch durch Next.js angewendet
export default function MyPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Seitentitel</h1>
          <p className="text-gray-600 mt-1">Beschreibung</p>
        </div>
        <Button>Aktion</Button>
      </div>
      
      {/* Content */}
      ...
    </div>
  );
}
```

---

## 📐 Seiten-Layout-Pattern

Jede neue Seite im `(app-layout)/` Ordner sollte diesem Pattern folgen:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// ... weitere Imports

export default function MyPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Loading State
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade Daten...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-red-600 mb-2">Fehler</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={refetch}>Erneut versuchen</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Hauptinhalt
  return (
    <div className="space-y-6">
      {/* 1. Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Seitentitel</h1>
          <p className="text-gray-600 mt-1">Kurze Beschreibung der Seite</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Neue Aktion
        </Button>
      </div>

      {/* 2. Stats Cards (optional) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Icon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Label</p>
                <p className="text-2xl font-bold">Wert</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Weitere Stats Cards... */}
      </div>

      {/* 3. Hauptinhalt (Table, Grid, etc.) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Listentitel</CardTitle>
            {/* Filter/Suche */}
          </div>
        </CardHeader>
        <CardContent>
          {/* Tabelle oder Grid */}
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 🎨 UI-Komponenten (shadcn/ui)

Alle UI-Komponenten sind in `src/components/ui/` und basieren auf [shadcn/ui](https://ui.shadcn.com/).

### Verfügbare Komponenten

| Kategorie | Komponenten |
|-----------|-------------|
| **Layout** | `Card`, `Separator`, `ScrollArea`, `Resizable`, `AspectRatio` |
| **Navigation** | `Tabs`, `Breadcrumb`, `NavigationMenu`, `Menubar`, `Pagination` |
| **Eingaben** | `Button`, `Input`, `Textarea`, `Select`, `Checkbox`, `Switch`, `Slider`, `RadioGroup`, `Calendar`, `DatePickerSelect` |
| **Daten** | `Table`, `Badge`, `Avatar`, `Progress`, `Chart` |
| **Feedback** | `Alert`, `AlertDialog`, `Dialog`, `Sheet`, `Drawer`, `Toast`, `Sonner`, `Skeleton` |
| **Overlay** | `Popover`, `Tooltip`, `HoverCard`, `ContextMenu`, `DropdownMenu`, `Command` |
| **Spezial** | `Accordion`, `Collapsible`, `Carousel`, `Form`, `RichTextEditor` |

### Import-Beispiele

```tsx
// UI Komponenten
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
```

---

## 🔽 Dropdown-Komponenten (WICHTIG!)

**Für alle Dropdown-Auswahlen müssen die wiederverwendbaren Dropdown-Komponenten verwendet werden!**

### Verfügbare Dropdown-Komponenten

| Komponente | Verwendung | Import |
|------------|------------|--------|
| `DropdownSelect` | **Single-Select** Dropdown | `import DropdownSelect from '@/components/ui/DropdownSelect'` |
| `MultiDropdownSelect` | **Multi-Select** Dropdown mit Checkboxen | `import MultiDropdownSelect from '@/components/ui/MultiDropdownSelect'` |

### DropdownSelect (Single-Select)

```tsx
import DropdownSelect from '@/components/ui/DropdownSelect';

// Beispiel: Status-Auswahl
<DropdownSelect
  items={statuses.map(s => ({ id: s.id, label: s.name }))}
  selectedId={currentStatusId}
  onSelect={(id) => handleStatusChange(id)}
  searchable={true}
  placeholder="Status suchen..."
  buttonClassName="px-2 py-1 rounded-full text-xs font-medium border cursor-pointer"
/>

// Mit Icons
<DropdownSelect
  items={users.map(u => ({
    id: u.id,
    label: u.name,
    icon: <Avatar className="h-4 w-4"><AvatarImage src={u.avatar} /></Avatar>
  }))}
  selectedId={assigneeId}
  onSelect={handleAssigneeChange}
/>
```

### MultiDropdownSelect (Multi-Select)

```tsx
import MultiDropdownSelect from '@/components/ui/MultiDropdownSelect';

// Beispiel: Produkte-Auswahl
<MultiDropdownSelect
  items={products.map(p => ({
    id: p.id,
    label: p.name,
    icon: p.icon ? <span>{p.icon}</span> : undefined,
  }))}
  selectedIds={selectedProductIds}
  onSelectionChange={(newIds) => setSelectedProductIds(newIds)}
  icon={<Package className="h-3 w-3 text-gray-500" />}
  emptyLabel="Produkte wählen"
  placeholder="Produkt suchen..."
  maxDisplayItems={2}
  buttonClassName="px-2 py-1 rounded-full text-xs font-medium border"
/>
```

### ❌ NICHT VERWENDEN für Dropdowns

```tsx
// ❌ FALSCH - Eigene Select-Implementierung
<Select open={open} onOpenChange={setOpen}>
  <SelectTrigger>...</SelectTrigger>
  <SelectContent>
    {items.map(item => (
      <div onClick={() => handleSelect(item.id)}>...</div>
    ))}
  </SelectContent>
</Select>

// ✅ RICHTIG - Wiederverwendbare Komponente
<DropdownSelect items={items} selectedId={selected} onSelect={handleSelect} />
<MultiDropdownSelect items={items} selectedIds={selectedIds} onSelectionChange={handleChange} />
```

### Wann welche Komponente?

| Anwendungsfall | Komponente |
|----------------|------------|
| Status, Priorität, Kategorie, Team, Benutzer (Einzelauswahl) | `DropdownSelect` |
| Produkte, Tags, Labels (Mehrfachauswahl) | `MultiDropdownSelect` |
| Einfache HTML-Selects in Formularen | `Select` (shadcn/ui) nur für einfache Fälle |

---

## 🎯 Styling-Konventionen

### Spacing

```tsx
// Container-Abstände
<div className="space-y-6">        // Hauptcontainer mit vertikalem Abstand
<div className="p-4 sm:p-6">       // Responsive Padding

// Grid-Layouts
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
```

### Farben

```tsx
// Status-Farben
'bg-blue-100 text-blue-800'    // Info/Default
'bg-green-100 text-green-800'  // Erfolg/Aktiv
'bg-yellow-100 text-yellow-800'// Warnung/Pausiert
'bg-red-100 text-red-800'      // Fehler/Kritisch
'bg-gray-100 text-gray-800'    // Neutral/Inaktiv
'bg-purple-100 text-purple-800'// Spezial
'bg-orange-100 text-orange-800'// Hinweis

// Text-Farben
'text-gray-600'                // Sekundärer Text
'text-gray-400'                // Deaktivierter Text
'text-red-600'                 // Fehler-Text
```

### Typografie

```tsx
// Überschriften
<h1 className="text-3xl font-bold">Seitentitel</h1>
<h2 className="text-xl font-semibold">Abschnittstitel</h2>
<h3 className="text-lg font-medium">Untertitel</h3>

// Text
<p className="text-gray-600 mt-1">Beschreibung</p>
<span className="text-sm text-gray-600">Klein</span>
<span className="text-xs text-gray-500">Sehr klein</span>
```

---

## 📊 Tabellen-Pattern

```tsx
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

// Horizontales Scrollen für breite Tabellen
<ScrollArea className="w-full">
  <div className="min-w-max">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Spalte 1</TableHead>
          <TableHead>Spalte 2</TableHead>
          <TableHead className="w-[100px]">Aktionen</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell>{item.name}</TableCell>
            <TableCell>{item.value}</TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Edit className="h-4 w-4 mr-2" />
                    Bearbeiten
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Löschen
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
  <ScrollBar orientation="horizontal" />
</ScrollArea>
```

---

## 🔲 Card-Pattern

```tsx
// Standard Card
<Card>
  <CardHeader>
    <CardTitle>Titel</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Inhalt */}
  </CardContent>
</Card>

// Stats Card
<Card>
  <CardContent className="p-6">
    <div className="flex items-center">
      <div className="p-2 bg-blue-100 rounded-lg">
        <Icon className="h-6 w-6 text-blue-600" />
      </div>
      <div className="ml-4">
        <p className="text-sm font-medium text-gray-600">Label</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  </CardContent>
</Card>

// Hover-fähige Card
<Card className="hover:shadow-md transition-shadow">
  {/* ... */}
</Card>
```

---

## 📝 Formular-Pattern

Formularkomponenten befinden sich in `src/components/forms/`.

### 🔲 Standard Dialog-Breiten (WICHTIG!)

**Alle großen Formular-Dialoge müssen diese einheitliche Breite verwenden:**

```tsx
// ✅ STANDARD für große Formulare (Aufgaben, Kunden, Projekte etc.)
<DialogContent className="w-[85vw] min-w-[900px] max-w-[1400px] max-h-[90vh] overflow-y-auto">

// ✅ STANDARD für kleine Dialoge (Bestätigungen, einfache Eingaben)
<DialogContent className="max-w-md">

// ❌ FALSCH - nicht mehr verwenden
<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
```

| Dialog-Typ | Klassen |
|------------|---------|
| **Große Formulare** (TaskForm, CustomerProfileEditForm, ProjectForm) | `w-[85vw] min-w-[900px] max-w-[1400px] max-h-[90vh] overflow-y-auto` |
| **Kleine Dialoge** (Bestätigung, Hinweise) | `max-w-md` |
| **Mittlere Dialoge** (einfache Formulare) | `max-w-lg max-h-[90vh] overflow-y-auto` |

### Dialog-basiertes Formular

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface MyFormProps {
  item?: MyItem;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MyForm({ item, onSubmit, onCancel, open, onOpenChange }: MyFormProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* ⚠️ Einheitliche Breite für große Formulare verwenden! */}
      <DialogContent className="w-[85vw] min-w-[900px] max-w-[1400px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? 'Bearbeiten' : 'Neu erstellen'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Formularfelder */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Abbrechen
            </Button>
            <Button type="submit">
              {item ? 'Speichern' : 'Erstellen'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 🔍 Such- und Filter-Pattern

```tsx
// Suchfeld mit Icon
<div className="relative w-64">
  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
  <Input
    placeholder="Suchen..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="pl-10"
  />
</div>

// Filter mit Select
<Select value={filter} onValueChange={setFilter}>
  <SelectTrigger className="w-40">
    <SelectValue placeholder="Filter" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">Alle</SelectItem>
    <SelectItem value="active">Aktiv</SelectItem>
    <SelectItem value="inactive">Inaktiv</SelectItem>
  </SelectContent>
</Select>
```

---

## 🎭 Status-Badge-Pattern

```tsx
// Funktion für Status-Farben
const getStatusColor = (status: string) => {
  switch (status) {
    case 'ACTIVE': return 'bg-green-100 text-green-800';
    case 'PENDING': return 'bg-yellow-100 text-yellow-800';
    case 'COMPLETED': return 'bg-blue-100 text-blue-800';
    case 'CANCELLED': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// Verwendung
<Badge className={getStatusColor(item.status)}>
  {item.status}
</Badge>
```

---

## 🗂️ Icons

Verwende Icons aus `lucide-react`:

```tsx
import { 
  Plus,           // Hinzufügen
  Edit,           // Bearbeiten
  Trash2,         // Löschen
  Eye,            // Anzeigen
  Search,         // Suchen
  Filter,         // Filtern
  MoreHorizontal, // Aktions-Menü
  Calendar,       // Datum
  Users,          // Benutzer
  Building2,      // Unternehmen
  Mail,           // E-Mail
  Phone,          // Telefon
  Settings,       // Einstellungen
  Shield,         // Sicherheit
  Package,        // Produkte
  Target,         // Projekte
  Tags,           // Kategorien
  X,              // Schließen
  Save,           // Speichern
  Check,          // Bestätigen
} from 'lucide-react';
```

---

## ✅ Checkliste für neue Seiten

- [ ] Seite liegt im `(app-layout)/` Ordner
- [ ] **Kein** `AppLayout` Import oder Wrapper
- [ ] Hauptcontainer ist `<div className="space-y-6">`
- [ ] Header mit Titel, Beschreibung und Haupt-Aktion
- [ ] Loading-State mit Spinner
- [ ] Error-State mit Fehlerkarte
- [ ] Stats Cards (falls sinnvoll)
- [ ] Hauptinhalt in `<Card>` Komponenten
- [ ] Tabellen mit `ScrollArea` für horizontales Scrollen
- [ ] Deutsche Texte und Beschriftungen
- [ ] Konsistente Farben und Spacing
- [ ] **Dialog-Breiten:** Große Formulare mit `w-[85vw] min-w-[900px] max-w-[1400px]`

---

## 🔄 CSS Variables (Theme) - Modernisiert Dezember 2025

Die Farbvariablen sind in `globals.css` definiert und nutzen das **OKLCH-Farbformat** für bessere Farbkonsistenz:

### Farbschema: "Modern Indigo"

```css
:root {
  /* Größerer Radius für moderne Optik */
  --radius: 0.75rem;
  
  /* Hintergründe - leichter Blau-Stich */
  --background: oklch(0.985 0.002 260);
  --foreground: oklch(0.15 0.01 260);
  
  /* Primary - Lebendiges Indigo */
  --primary: oklch(0.5 0.2 265);
  --primary-foreground: oklch(0.98 0 0);
  
  /* Accent - Leichtes Violet */
  --accent: oklch(0.94 0.03 280);
  --accent-foreground: oklch(0.3 0.1 280);
  
  /* Weitere Variablen... */
}

.dark {
  /* Tiefes Blau statt reines Schwarz */
  --background: oklch(0.14 0.015 260);
  --foreground: oklch(0.95 0.005 260);
  
  /* Primary - Helleres Indigo für Dark Mode */
  --primary: oklch(0.7 0.18 265);
  /* ... */
}
```

### Typografie

Das Projekt verwendet zwei Google Fonts:
- **Space Grotesk** (`--font-space-grotesk`): Für Überschriften (h1-h6)
- **Inter** (`--font-inter`): Für Fließtext

```tsx
// Überschriften verwenden automatisch Space Grotesk
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-space-grotesk);
  letter-spacing: -0.02em;
}
```

### Neue Utility-Klassen

```tsx
// Gradient Hintergründe
<div className="gradient-primary">

// Text-Gradient
<h1 className="text-gradient">Farbverlauf-Text</h1>

// Glow-Schatten (für Buttons/Cards)
<Button className="shadow-glow">
<Button className="shadow-glow-lg">

// Glasmorphismus
<header className="glass">

// Weiche Schatten
<Card className="shadow-soft">

// Thin Scrollbar
<div className="scrollbar-thin overflow-y-auto">
```

Verwende diese mit Tailwind:

```tsx
<div className="bg-background text-foreground">
<div className="bg-card text-card-foreground">
<button className="bg-primary text-primary-foreground">
<span className="text-muted-foreground">
```

---

## 📱 Responsive Design

```tsx
// Mobile-first Breakpoints
sm: 640px   // Tablets
md: 768px   // Kleine Laptops
lg: 1024px  // Desktop
xl: 1280px  // Große Displays
2xl: 1536px // Extra große Displays

// Beispiele
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
<div className="p-4 sm:p-6">
<div className="hidden lg:block">  // Nur auf Desktop sichtbar
<div className="lg:hidden">        // Nur auf Mobile/Tablet sichtbar
```

---

## 🧪 Hooks

Verfügbare Custom Hooks:

| Hook | Beschreibung |
|------|--------------|
| `useTaskContext` | Globaler Task-State |
| `useTeamContext` | Globaler Team-State |
| `useUserPermissions` | Benutzerberechtigungen |
| `useMobile` | Mobile Detection |
| `useToast` | Toast-Benachrichtigungen |

```tsx
import { useToast } from '@/hooks/use-toast';

const { toast } = useToast();
toast({
  title: 'Erfolg',
  description: 'Aktion wurde ausgeführt.',
});
```

---

---

## 🏢 Multi-Tenant-Architektur

Dieses Projekt unterstützt Mandantenfähigkeit (Multi-Tenancy). Jeder Tenant (Kunde/Organisation) sieht nur seine eigenen Daten.

### Aktueller Status

| Komponente | Status | Beschreibung |
|------------|--------|--------------|
| Tenant-Erkennung | ✅ Implementiert | Via Subdomain, Query-Parameter oder fixed |
| Auth-Middleware | ✅ Implementiert | JWT-basierte Zugriffsprüfung |
| Datenbank-Isolation | ⚠️ Teilweise | Nur `Customer` hat `tenantId` |
| API-Tenant-Filter | ⚠️ Teilweise | Nur `/api/customers` filtert |

### Tenant-Quellen

Konfigurierbar via `NEXT_PUBLIC_APP_TENANT_SOURCE`:

```bash
# Option 1: Subdomain (Default)
# kunde1.app.example.com → tenant = "kunde1"
NEXT_PUBLIC_APP_TENANT_SOURCE=subdomain

# Option 2: Query-Parameter
# app.example.com?tenant=kunde1 → tenant = "kunde1"
NEXT_PUBLIC_APP_TENANT_SOURCE=query

# Option 3: Fester Wert (Development)
NEXT_PUBLIC_APP_TENANT_SOURCE=fixed
NEXT_PUBLIC_APP_FIXED_TENANT=local
```

### Berechtigungs-Claims (JWT)

```typescript
// Keycloak/OIDC Token Claims
{
  "realm_access": { "roles": ["global_admin"] },  // Übergreifender Admin
  "use_docklytask": ["tenant1", "tenant2"],       // Lesezugriff
  "manage_docklytask": ["tenant1"]                // Schreibzugriff
}
```

---

## 🛠️ Multi-Tenant-Implementierungsplan

### Übersicht der Änderungen

| Bereich | Anzahl | Status |
|---------|--------|--------|
| **Core Models (brauchen `tenantId`)** | 9 | 🔴 Offen |
| **Dependent Models (erben via Relation)** | 12 | ⚪ Nicht nötig |
| **API-Routen (brauchen Tenant-Filter)** | ~16 | 🔴 Offen |

### Phase 1: Prisma Schema erweitern

**Core Models die `tenantId` bekommen müssen:**

```prisma
// Diese 9 Models brauchen direkt tenantId:
model User {
  // ... bestehende Felder
  tenantId    String    @default("default")
  @@index([tenantId])
}

model Product {
  tenantId    String    @default("default")
  @@index([tenantId])
}

model Category {
  tenantId    String    @default("default")
  @@index([tenantId])
}

model Project {
  tenantId    String    @default("default")
  @@index([tenantId])
}

model Task {
  tenantId    String    @default("default")
  @@index([tenantId])
}

model TaskStatus {
  tenantId    String    @default("default")
  @@index([tenantId])
}

model Team {
  tenantId    String    @default("default")
  @@index([tenantId])
}

model ProjectTemplate {
  tenantId    String    @default("default")
  @@index([tenantId])
}

model AppConfiguration {
  tenantId    String    @default("default")
  @@index([tenantId])
}
```

**Dependent Models (erben Tenant via Relation):**
- `SubTask` → via `Task.tenantId`
- `TaskAttachment` → via `Task.tenantId`
- `TaskComment` → via `Task.tenantId`
- `TaskChatMessage` → via `Task.tenantId`
- `TaskCustomerChatMessage` → via `Task.tenantId`
- `CommentAttachment` → via `TaskComment`
- `ProjectAssignee` → via `Project.tenantId`
- `ProjectProduct` → via `Project.tenantId`
- `TemplateProduct` → via `ProjectTemplate.tenantId`
- `TemplateTask` → via `ProjectTemplate.tenantId`
- `TeamMember` → via `Team.tenantId`
- `RolePermission` → global (kein Tenant nötig)

---

## 📋 Projektvorlagen-System

### Übersicht

Das Projektvorlagen-System ermöglicht die Definition von wiederverwendbaren Projekt-Blueprints mit vordefinierten Aufgaben.

### Komponenten

| Komponente | Pfad | Beschreibung |
|------------|------|--------------|
| **ProjectTemplatesPage** | `src/app/(app-layout)/project-templates/page.tsx` | Hauptseite für Vorlagenverwaltung |
| **ProjectTemplateForm** | `src/components/forms/ProjectTemplateForm.tsx` | Formular für Vorlage (Name, Beschreibung, Produkte) |
| **TemplateTaskForm** | `src/components/forms/TemplateTaskForm.tsx` | Formular für Aufgaben in Vorlagen |
| **TemplateTaskManager** | `src/components/shared/TemplateTaskManager.tsx` | Dialog zur Aufgabenverwaltung in Vorlage |

### API-Routen

| Route | Methoden | Beschreibung |
|-------|----------|--------------|
| `/api/project-templates` | GET, POST | Vorlagen abrufen/erstellen |
| `/api/project-templates/[id]` | GET, PUT, DELETE | Einzelne Vorlage verwalten |
| `/api/template-tasks` | GET, POST | Vorlagenaufgaben abrufen/erstellen |
| `/api/template-tasks/[id]` | GET, PUT, DELETE | Einzelne Vorlagenaufgabe verwalten |

### Datenmodell

```prisma
model ProjectTemplate {
  id          String   @id @default(cuid())
  name        String
  description String?
  tenantId    String   @default("default")
  
  products    TemplateProduct[]
  tasks       TemplateTask[]
}

model TemplateTask {
  id           String       @id @default(cuid())
  title        String
  description  String?
  priority     TaskPriority @default(MEDIUM)
  templateId   String
  parentTaskId String?      // Für Unteraufgaben
  
  template     ProjectTemplate @relation(...)
  parentTask   TemplateTask?   @relation("TemplateTaskSubtasks", ...)
  subtasks     TemplateTask[]  @relation("TemplateTaskSubtasks")
}
```

### Workflow

1. **Vorlage erstellen:** Name, Beschreibung und Produkte definieren
2. **Aufgaben hinzufügen:** Über "Aufgaben verwalten" öffnet sich der TemplateTaskManager
3. **Aufgaben konfigurieren:** Titel, Beschreibung, Priorität, optional als Unteraufgabe
4. **Projekt erstellen:** Bei Projekterstellung aus Vorlage werden alle Aufgaben automatisch angelegt

### Verwendung des TemplateTaskManager

```tsx
import TemplateTaskManager from '@/components/shared/TemplateTaskManager';

// In der Komponente
const [showTaskManager, setShowTaskManager] = useState(false);
const [managingTemplate, setManagingTemplate] = useState<ProjectTemplate | null>(null);

// Öffnen
const handleManageTasks = (template: ProjectTemplate) => {
  setManagingTemplate(template);
  setShowTaskManager(true);
};

// Render
<TemplateTaskManager
  template={managingTemplate}
  open={showTaskManager}
  onOpenChange={(isOpen) => {
    setShowTaskManager(isOpen);
    if (!isOpen) setManagingTemplate(null);
  }}
  onTasksUpdated={() => fetchData()}
/>
```

---

## 🚀 Projekterstellung mit Vorlagen

### Übersicht

Die Projekterstellung aus Vorlagen ermöglicht es, Projekte schnell mit vordefinierten Aufgaben zu erstellen.

### Komponenten

| Komponente | Pfad | Beschreibung |
|------------|------|--------------|
| **CreateProjectDialog** | `src/components/shared/CreateProjectDialog.tsx` | Wiederverwendbarer Dialog zur Projekterstellung |

### API-Routen

| Route | Methoden | Beschreibung |
|-------|----------|--------------|
| `/api/projects/from-template` | GET | Verfügbare Vorlagen mit Aufgaben-Anzahl abrufen |
| `/api/projects/from-template` | POST | Projekt aus Vorlage erstellen |

### Verwendung des CreateProjectDialog

```tsx
import { CreateProjectDialog } from '@/components/shared/CreateProjectDialog';

// In der Komponente
const [createProjectDialogOpen, setCreateProjectDialogOpen] = useState(false);

// Render
<CreateProjectDialog
  open={createProjectDialogOpen}
  onOpenChange={setCreateProjectDialogOpen}
  customerId={customerId}
  customerName={customer.name}
  onProjectCreated={() => fetchCustomer()}
/>
```

### Props

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `open` | `boolean` | Ob der Dialog geöffnet ist |
| `onOpenChange` | `(open: boolean) => void` | Callback beim Öffnen/Schließen |
| `customerId` | `string` | ID des Kunden für das Projekt |
| `customerName` | `string?` | Name des Kunden (für Anzeige) |
| `onProjectCreated` | `(project: any) => void` | Callback nach erfolgreicher Erstellung |

### Features

- **Mit Vorlage erstellen:** Wählt eine Projektvorlage aus und erstellt alle Aufgaben automatisch
- **Ohne Vorlage erstellen:** Erstellt ein leeres Projekt ohne vordefinierte Aufgaben
- **Nur Name änderbar:** Bei Vorlagenauswahl wird der Name vorgeschlagen, kann aber geändert werden
- **Wiederverwendbar:** Kann in Kundenansicht und Projekte-Übersicht verwendet werden

### API-Request (POST)

```typescript
// POST /api/projects/from-template
{
  name: "Projektname",
  customerId: "customer-id",
  templateId: "template-id" | null, // null = ohne Vorlage
  description?: "Optional",
  goLiveDate?: "2024-12-31",
  assigneeIds?: ["user-id-1", "user-id-2"]
}
```

### API-Response

```typescript
{
  project: {
    id: "project-id",
    name: "Projektname",
    customer: { id, name },
    tasks: [...],
    // weitere Felder
  },
  tasksCreated: 5,
  message: "Projekt mit 5 Aufgaben aus Vorlage erstellt."
}
```

---

### Phase 2: Tenant-Helper erstellen

Neue Datei `src/lib/tenant-db.ts`:

```typescript
import { prisma } from '@/lib/db';
import { headers } from 'next/headers';

// Tenant aus Request-Header extrahieren (Server-Side)
export function getTenantFromHeaders(): string {
  const headersList = headers();
  const host = headersList.get('host') || '';
  const source = process.env.NEXT_PUBLIC_APP_TENANT_SOURCE || 'subdomain';
  
  if (source === 'fixed') {
    return process.env.NEXT_PUBLIC_APP_FIXED_TENANT || 'local';
  }
  
  if (source === 'subdomain') {
    const parts = host.split('.');
    if (parts.length > 2) return parts[0];
  }
  
  return 'local';
}

// Prisma-Where mit Tenant-Filter
export function withTenant<T extends object>(where: T = {} as T): T & { tenantId: string } {
  return { ...where, tenantId: getTenantFromHeaders() };
}

// Prisma-Data mit Tenant für Create
export function withTenantData<T extends object>(data: T): T & { tenantId: string } {
  return { ...data, tenantId: getTenantFromHeaders() };
}
```

### Phase 3: API-Routen aktualisieren

**Pattern für alle API-Routen:**

```typescript
// VORHER (ohne Tenant)
export async function GET() {
  const items = await prisma.project.findMany();
  return NextResponse.json(items);
}

// NACHHER (mit Tenant)
import { withTenant } from '@/lib/tenant-db';

export async function GET() {
  const items = await prisma.project.findMany({
    where: withTenant()
  });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const data = await req.json();
  const item = await prisma.project.create({
    data: withTenantData(data)
  });
  return NextResponse.json(item);
}
```

**Betroffene API-Routen (16):**

| Route | Methoden | Priorität |
|-------|----------|-----------|
| `/api/projects` | GET, POST | 🔴 Hoch |
| `/api/projects/[id]` | GET, PUT, DELETE | 🔴 Hoch |
| `/api/tasks` | GET, POST | 🔴 Hoch |
| `/api/tasks/[id]` | GET, PUT, DELETE | 🔴 Hoch |
| `/api/task-statuses` | GET, POST | 🟡 Mittel |
| `/api/task-statuses/[id]` | GET, PUT, DELETE | 🟡 Mittel |
| `/api/teams` | GET, POST | 🟡 Mittel |
| `/api/teams/[id]` | GET, PUT, DELETE | 🟡 Mittel |
| `/api/products` | GET, POST | 🟡 Mittel |
| `/api/products/[id]` | GET, PUT, DELETE | 🟡 Mittel |
| `/api/categories` | GET, POST | 🟢 Niedrig |
| `/api/categories/[id]` | GET, PUT, DELETE | 🟢 Niedrig |
| `/api/project-templates` | GET, POST | 🟢 Niedrig |
| `/api/project-templates/[id]` | GET, PUT, DELETE | 🟢 Niedrig |
| `/api/users` | GET, POST | 🟢 Niedrig |
| `/api/users/[id]` | GET, PUT, DELETE | 🟢 Niedrig |

### Phase 4: Migration durchführen

```bash
# 1. Migration erstellen
npx prisma migrate dev --name add_tenant_id_to_all_models

# 2. Bestehende Daten dem Default-Tenant zuweisen
# (automatisch via @default("default") oder manuell)

# 3. Prisma Client neu generieren
npx prisma generate
```

### Phase 5: Frontend anpassen

**Tenant im Context verwenden:**

```typescript
import { useAuth } from '@/auth/AuthProvider';

function MyComponent() {
  const { tenant } = useAuth();
  
  // Tenant wird automatisch in API-Calls eingebunden
  // via Authorization-Header und Server-Side Extraction
}
```

### Sicherheits-Checkliste

- [ ] Alle API-Routen haben Tenant-Filter in `where`
- [ ] Alle `create`-Operationen haben `tenantId` in `data`
- [ ] Keine Cross-Tenant-Datenlecks bei Relations
- [ ] Globale Admins können Tenant wechseln
- [ ] Audit-Logging für Tenant-Zugriffe

---

*Letzte Aktualisierung: November 2025*

