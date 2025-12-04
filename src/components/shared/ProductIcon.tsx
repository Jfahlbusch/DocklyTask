'use client';

import * as LucideIcons from 'lucide-react';

interface ProductIconProps {
  icon?: string;
  className?: string;
  fallback?: React.ReactNode;
}

/**
 * Rendert ein Produkt-Icon.
 * Unterstützt:
 * - Lucide Icons: "lucide:Server", "lucide:Database", etc.
 * - Emojis: "📦", "🔧", etc.
 * - Beliebiger Text
 */
export default function ProductIcon({ icon, className = "w-4 h-4", fallback }: ProductIconProps) {
  if (!icon) {
    return fallback ? <>{fallback}</> : <span className="text-sm">📦</span>;
  }
  
  // Lucide Icon Format: "lucide:IconName"
  if (icon.startsWith('lucide:')) {
    const iconName = icon.replace('lucide:', '') as keyof typeof LucideIcons;
    const LucideIcon = LucideIcons[iconName] as React.ComponentType<{ className?: string }>;
    if (LucideIcon) {
      return <LucideIcon className={className} />;
    }
    // Fallback wenn Icon nicht gefunden
    return <span className="text-sm">📦</span>;
  }
  
  // Emoji oder benutzerdefinierter Text
  return <span className="text-sm">{icon}</span>;
}

/**
 * Rendert ein Produkt-Icon als React-Element für Dropdown-Items.
 * Nützlich für die Verwendung in DropdownSelect/MultiDropdownSelect.
 */
export function renderProductIcon(icon?: string, className = "w-4 h-4"): React.ReactNode {
  if (!icon) {
    return <span className="text-sm">📦</span>;
  }
  
  if (icon.startsWith('lucide:')) {
    const iconName = icon.replace('lucide:', '') as keyof typeof LucideIcons;
    const LucideIcon = LucideIcons[iconName] as React.ComponentType<{ className?: string }>;
    if (LucideIcon) {
      return <LucideIcon className={className} />;
    }
    return <span className="text-sm">📦</span>;
  }
  
  return <span className="text-sm">{icon}</span>;
}

