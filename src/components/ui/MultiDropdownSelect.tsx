'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Check, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface MultiDropdownItem {
  id: string;
  label: string;
  color?: string;
  icon?: React.ReactNode;
  [key: string]: any;
}

export interface MultiDropdownSelectProps {
  items: MultiDropdownItem[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  buttonClassName?: string;
  getItemClassName?: (item: MultiDropdownItem, isSelected: boolean) => string;
  searchable?: boolean;
  placeholder?: string;
  emptyLabel?: string;
  maxDisplayItems?: number;
  renderInPortal?: boolean;
  zIndex?: number;
  icon?: React.ReactNode;
}

export default function MultiDropdownSelect({
  items,
  selectedIds,
  onSelectionChange,
  buttonClassName,
  getItemClassName,
  searchable = true,
  placeholder = 'Suchen...',
  emptyLabel = 'Auswählen',
  maxDisplayItems = 2,
  renderInPortal = true,
  zIndex = 100000,
  icon,
}: MultiDropdownSelectProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [dropUp, setDropUp] = useState(false);
  const [query, setQuery] = useState('');
  const [coords, setCoords] = useState<{ left: number; top: number; width: number } | null>(null);

  const selectedItems = useMemo(
    () => items.filter((i) => selectedIds.includes(i.id)),
    [items, selectedIds]
  );

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
            setCoords({
              left: Math.round(rect.left),
              top: Math.round(rect.bottom + 6),
              width: Math.max(Math.round(rect.width), 220),
            });
          }
        } catch {}
      }
      return next;
    });
  };

  useEffect(() => {
    if (!open || !renderInPortal) return;
    try {
      const anchorRect = anchorRef.current?.getBoundingClientRect();
      const menuEl = menuRef.current;
      if (!anchorRect || !menuEl) return;
      if (dropUp) {
        const h = menuEl.offsetHeight || 0;
        setCoords({
          left: Math.round(anchorRect.left),
          top: Math.round(anchorRect.top - h - 6),
          width: Math.max(Math.round(anchorRect.width), 220),
        });
      } else {
        setCoords({
          left: Math.round(anchorRect.left),
          top: Math.round(anchorRect.bottom + 6),
          width: Math.max(Math.round(anchorRect.width), 220),
        });
      }
    } catch {}
  }, [open, dropUp, renderInPortal]);

  const handleToggle = (itemId: string) => {
    if (selectedIds.includes(itemId)) {
      onSelectionChange(selectedIds.filter((id) => id !== itemId));
    } else {
      onSelectionChange([...selectedIds, itemId]);
    }
  };

  const defaultGetItemClassName = (item: MultiDropdownItem, isSelected: boolean) =>
    `block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 cursor-pointer ${isSelected ? 'bg-blue-50 font-medium' : ''}`;

  const triggerClass =
    buttonClassName ||
    'px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity bg-gray-100 text-gray-800 border';

  const menuContent = (
    <div
      ref={menuRef}
      className="w-56 bg-white border border-gray-200 rounded-md shadow-lg"
      style={{
        position: renderInPortal ? ('fixed' as const) : ('absolute' as const),
        left: renderInPortal ? (coords?.left ?? 0) : 0,
        top: renderInPortal
          ? (coords?.top ?? 0)
          : dropUp
          ? undefined
          : ('calc(100% + 6px)' as any),
        bottom: renderInPortal ? undefined : dropUp ? ('calc(100% + 6px)' as any) : undefined,
        zIndex: renderInPortal ? zIndex : undefined,
        minWidth: coords?.width ?? 220,
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
      <div className="py-1 max-h-[260px] overflow-auto">
        {filteredItems.map((item) => {
          const isSelected = selectedIds.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                handleToggle(item.id);
              }}
              role="menuitemcheckbox"
              aria-checked={isSelected}
              className={(getItemClassName || defaultGetItemClassName)(item, isSelected)}
            >
              <span className="inline-flex items-center gap-2 w-full">
                <span
                  className={`inline-flex items-center justify-center w-4 h-4 rounded border ${
                    isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3 text-white" />}
                </span>
                {item.icon ? (
                  <span className="inline-flex items-center justify-center">{item.icon}</span>
                ) : item.color ? (
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                ) : null}
                <span className="flex-1 truncate">{item.label}</span>
              </span>
            </button>
          );
        })}
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
        onClick={(e) => {
          e.stopPropagation();
          openMenu();
        }}
        className={triggerClass}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-1 flex-wrap">
          {icon && <span className="inline-flex items-center justify-center">{icon}</span>}
          {selectedItems.length === 0 ? (
            <span className="text-gray-400">{emptyLabel}</span>
          ) : selectedItems.length <= maxDisplayItems ? (
            selectedItems.map((item) => (
              <Badge key={item.id} variant="secondary" className="text-[10px] px-1 py-0">
                {item.icon && <span className="mr-0.5">{item.icon}</span>}
                {item.label}
              </Badge>
            ))
          ) : (
            <span>{selectedItems.length} ausgewählt</span>
          )}
        </span>
        <ChevronDown className="h-3 w-3 inline ml-1 flex-shrink-0" />
      </button>
      {open && (renderInPortal ? createPortal(menuContent, document.body) : menuContent)}
    </div>
  );
}

