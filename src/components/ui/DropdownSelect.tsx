'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search } from 'lucide-react';
// removed portal usage to avoid conflicts inside Dialogs

export interface DropdownItem {
  id: string;
  label: string;
  color?: string; // Tailwind classes or hex value for dot
  icon?: React.ReactNode; // Optional icon element shown left of label
  [key: string]: any;
}

export interface DropdownSelectProps {
  items: DropdownItem[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
  buttonClassName?: string; // Trigger styling
  getItemClassName?: (item: DropdownItem, isActive: boolean) => string; // Item styling
  searchable?: boolean;
  placeholder?: string;
  onOpenChange?: (open: boolean) => void;
  renderInPortal?: boolean; // Menü via Portal (Top-Layer) rendern
  zIndex?: number; // z-index für Portal-Menü
}

export default function DropdownSelect({
  items,
  selectedId,
  onSelect,
  buttonClassName,
  getItemClassName,
  searchable = true,
  placeholder = 'Suchen...',
  onOpenChange,
  renderInPortal = true,
  zIndex = 100000,
}: DropdownSelectProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [dropUp, setDropUp] = useState(false);
  // We no longer need absolute screen coords since we render menu relative to anchor
  const [query, setQuery] = useState('');
  const [coords, setCoords] = useState<{ left: number; top: number; width: number } | null>(null);

  const selected = useMemo(() => items.find((i) => i.id === selectedId) || null, [items, selectedId]);
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.label.toLowerCase().includes(q));
  }, [items, query]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      const anchor = anchorRef.current;
      const menu = menuRef.current;
      const target = e.target as Node;
      if (anchor && anchor.contains(target)) return;
      if (menu && menu.contains(target)) return;
      setOpen(false);
    }
    // Verwende 'click' statt 'mousedown', damit Item-Clicks zuerst feuern
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [open]);

  const openMenu = () => {
    setOpen((prev) => {
      const next = !prev;
      if (!prev) {
        try {
          const rect = anchorRef.current?.getBoundingClientRect();
          if (rect) {
            const spaceBelow = window.innerHeight - rect.bottom;
            setDropUp(spaceBelow < 240);
            setCoords({ left: Math.round(rect.left), top: Math.round(rect.bottom + 6), width: Math.round(rect.width) });
          }
        } catch {}
      }
      return next;
    });
  };

  // Nach dem Öffnen und Rendern Höhe messen, um DropUp präzise zu positionieren
  useEffect(() => {
    if (!open || !renderInPortal) return;
    try {
      const anchorRect = anchorRef.current?.getBoundingClientRect();
      const menuEl = menuRef.current;
      if (!anchorRect || !menuEl) return;
      if (dropUp) {
        const h = menuEl.offsetHeight || 0;
        setCoords({ left: Math.round(anchorRect.left), top: Math.round(anchorRect.top - h - 6), width: Math.round(anchorRect.width) });
      } else {
        setCoords({ left: Math.round(anchorRect.left), top: Math.round(anchorRect.bottom + 6), width: Math.round(anchorRect.width) });
      }
    } catch {}
  }, [open, dropUp, renderInPortal]);

  const defaultGetItemClassName = (item: DropdownItem, isActive: boolean) =>
    `block w-full text-left px-3 py-1 text-sm hover:bg-gray-100 ${isActive ? 'bg-gray-100 font-medium' : ''}`;

  const triggerClass =
    buttonClassName ||
    'px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity bg-gray-100 text-gray-800';

  const menuContent = (
    <div
      ref={menuRef}
      className="w-56 bg-white border border-gray-200 rounded-md shadow-lg"
      style={{
        position: renderInPortal ? 'fixed' as const : 'absolute' as const,
        left: renderInPortal ? (coords?.left ?? 0) : 0,
        top: renderInPortal ? (coords?.top ?? 0) : (dropUp ? undefined : ('calc(100% + 6px)' as any)),
        bottom: renderInPortal ? undefined : (dropUp ? ('calc(100% + 6px)' as any) : undefined),
        zIndex: renderInPortal ? zIndex : undefined,
      }}
      role="menu"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {searchable && (
        <div className="p-2 border-b bg-gray-50">
          <div className="flex items-center gap-2 rounded border px-2 py-1 bg-white">
            <Search className="h-3 w-3 text-gray-500" />
            <input
              className="w-full text-sm outline-none"
              placeholder={placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
        </div>
      )}
      <div className="py-1 max-h[260px] max-h-[260px] overflow-auto">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(item.id);
              setOpen(false);
            }}
            role="menuitemradio"
            aria-checked={item.id === selectedId}
            className={(getItemClassName || defaultGetItemClassName)(item, item.id === selectedId)}
          >
            <span className="inline-flex items-center gap-2">
              {item.icon ? (
                <span className="inline-flex items-center justify-center">{item.icon}</span>
              ) : item.color ? (
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              ) : null}
              {item.label}
            </span>
          </button>
        ))}
        {filteredItems.length === 0 && (
          <div className="px-3 py-2 text-xs text-gray-500">Keine Ergebnisse</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="relative" ref={anchorRef} onMouseDown={(e) => e.stopPropagation()}>
      <button
        type="button"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); openMenu(); }}
        className={triggerClass}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-2">
          {selected?.icon ? (
            <span className="inline-flex items-center justify-center">{selected.icon}</span>
          ) : selected?.color ? (
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selected.color }} />
          ) : null}
          {selected?.label || 'Auswählen'}
        </span>
        <ChevronDown className="h-3 w-3 inline ml-1" />
      </button>
      {open && (renderInPortal ? createPortal(menuContent, document.body) : menuContent)}
    </div>
  );
}


