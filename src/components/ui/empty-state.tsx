'use client';

import { cn } from "@/lib/utils"
import { Button } from "./button"
import { FadeIn } from "@/components/motion"
import { 
  FileSearch, 
  FolderOpen, 
  Users, 
  ClipboardList, 
  Package, 
  Tags,
  Inbox,
  Search,
  Plus,
  type LucideIcon
} from "lucide-react"

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  variant?: 'default' | 'compact' | 'large';
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  secondaryAction,
  className,
  variant = 'default',
}: EmptyStateProps) {
  const sizeClasses = {
    compact: {
      container: 'py-8',
      icon: 'w-12 h-12',
      iconWrapper: 'w-16 h-16',
      title: 'text-base',
      description: 'text-sm',
    },
    default: {
      container: 'py-12',
      icon: 'w-16 h-16',
      iconWrapper: 'w-24 h-24',
      title: 'text-lg',
      description: 'text-sm',
    },
    large: {
      container: 'py-20',
      icon: 'w-20 h-20',
      iconWrapper: 'w-32 h-32',
      title: 'text-xl',
      description: 'text-base',
    },
  }

  const sizes = sizeClasses[variant]

  return (
    <FadeIn>
      <div className={cn(
        "flex flex-col items-center justify-center text-center",
        sizes.container,
        className
      )}>
        {/* Animated Icon Container */}
        <div className={cn(
          "relative rounded-full bg-muted/50 flex items-center justify-center mb-6",
          "before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-br before:from-primary/10 before:to-primary/5",
          "animate-pulse-slow",
          sizes.iconWrapper
        )}>
          <Icon className={cn(
            "text-muted-foreground/60",
            sizes.icon
          )} />
          
          {/* Decorative Elements */}
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary/20 rounded-full" />
          <div className="absolute -bottom-2 -left-1 w-2 h-2 bg-primary/30 rounded-full" />
        </div>

        {/* Text Content */}
        <h3 className={cn(
          "font-semibold text-foreground mb-2",
          sizes.title
        )}>
          {title}
        </h3>
        
        {description && (
          <p className={cn(
            "text-muted-foreground max-w-md mx-auto",
            sizes.description
          )}>
            {description}
          </p>
        )}

        {/* Actions */}
        {(action || secondaryAction) && (
          <div className="flex items-center gap-3 mt-6">
            {action && (
              <Button onClick={action.onClick} className="gap-2">
                <Plus className="w-4 h-4" />
                {action.label}
              </Button>
            )}
            {secondaryAction && (
              <Button variant="outline" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </div>
    </FadeIn>
  )
}

// ============================================
// 🎨 PRESET EMPTY STATES
// ============================================

export function NoTasksEmpty({ onCreateTask }: { onCreateTask?: () => void }) {
  return (
    <EmptyState
      icon={ClipboardList}
      title="Keine Aufgaben vorhanden"
      description="Erstellen Sie Ihre erste Aufgabe, um loszulegen. Aufgaben helfen Ihnen, Ihre Arbeit zu organisieren und den Überblick zu behalten."
      action={onCreateTask ? {
        label: "Neue Aufgabe",
        onClick: onCreateTask
      } : undefined}
    />
  )
}

export function NoProjectsEmpty({ onCreateProject }: { onCreateProject?: () => void }) {
  return (
    <EmptyState
      icon={FolderOpen}
      title="Keine Projekte vorhanden"
      description="Projekte helfen Ihnen, zusammengehörige Aufgaben zu gruppieren und den Fortschritt zu verfolgen."
      action={onCreateProject ? {
        label: "Neues Projekt",
        onClick: onCreateProject
      } : undefined}
    />
  )
}

export function NoCustomersEmpty({ onCreateCustomer }: { onCreateCustomer?: () => void }) {
  return (
    <EmptyState
      icon={Users}
      title="Keine Kunden vorhanden"
      description="Fügen Sie Kunden hinzu, um Projekte und Aufgaben mit ihnen zu verknüpfen."
      action={onCreateCustomer ? {
        label: "Neuen Kunden",
        onClick: onCreateCustomer
      } : undefined}
    />
  )
}

export function NoProductsEmpty({ onCreateProduct }: { onCreateProduct?: () => void }) {
  return (
    <EmptyState
      icon={Package}
      title="Keine Produkte vorhanden"
      description="Produkte können mit Aufgaben verknüpft werden, um die Arbeit zu kategorisieren."
      action={onCreateProduct ? {
        label: "Neues Produkt",
        onClick: onCreateProduct
      } : undefined}
    />
  )
}

export function NoCategoriesEmpty({ onCreateCategory }: { onCreateCategory?: () => void }) {
  return (
    <EmptyState
      icon={Tags}
      title="Keine Kategorien vorhanden"
      description="Kategorien helfen Ihnen, Aufgaben und Projekte zu organisieren."
      action={onCreateCategory ? {
        label: "Neue Kategorie",
        onClick: onCreateCategory
      } : undefined}
    />
  )
}

export function NoSearchResultsEmpty({ query, onClear }: { query?: string; onClear?: () => void }) {
  return (
    <EmptyState
      icon={Search}
      title="Keine Ergebnisse gefunden"
      description={query 
        ? `Für "${query}" wurden keine Ergebnisse gefunden. Versuchen Sie einen anderen Suchbegriff.`
        : "Für Ihre Suche wurden keine Ergebnisse gefunden."
      }
      secondaryAction={onClear ? {
        label: "Filter zurücksetzen",
        onClick: onClear
      } : undefined}
    />
  )
}

export function NoDataEmpty() {
  return (
    <EmptyState
      icon={FileSearch}
      title="Keine Daten vorhanden"
      description="Es sind noch keine Daten verfügbar. Beginnen Sie, indem Sie neue Einträge hinzufügen."
      variant="compact"
    />
  )
}

