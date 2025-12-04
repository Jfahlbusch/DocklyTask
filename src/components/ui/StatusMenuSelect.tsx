'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { createPortal } from 'react-dom';

export interface DropdownItem {
  id: string;
  label: string;
  color?: string; // Tailwind classes or hex
  [key: string]: any;
}

interface StatusMenuSelectProps {
  items: DropdownItem[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
  buttonClassName?: string; // Klassen für den Trigger-Button (Formatierung)
  getItemClassName?: (item: DropdownItem, isActive: boolean) => string; // Formatierung je Eintrag
  searchable?: boolean;
  placeholder?: string;
}

export default function StatusMenuSelect({
  items,
  selectedId,
  onSelect,
  buttonClassName,
  getItemClassName,
  searchable = true,
  placeholder = 'Suchen...'
}: StatusMenuSelectProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const [dropUp, setDropUp] = useState(false);
  const [coords, setCoords] = useState<{ left: number; top: number; height: number } | null>(null);
  const [query, setQuery] = useState('');

  const selected = useMemo(() => items.find(i => i.id === selectedId) || null, [items, selectedId]);
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i => i.label.toLowerCase().includes(q));
  }, [items, query]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      const el = anchorRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const openMenu = () => {
    setOpen(prev => {
      const next = !prev;
      if (!prev) {
        try {
          const rect = anchorRef.current?.getBoundingClientRect();
          if (rect) {
            const spaceBelow = window.innerHeight - rect.bottom;
            setDropUp(spaceBelow < 240);
            setCoords({ left: rect.left, top: rect.top, height: rect.height });
          }
        } catch {}
      }
      return next;
    });
  };

  const defaultGetItemClassName = (item: DropdownItem, isActive: boolean) =>
    `block w-full text-left px-3 py-1 text-sm hover:bg-gray-100 ${
      isActive ? 'bg-gray-100 font-medium' : ''
    }`;

  const triggerClass =
    buttonClassName ||
    'px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity bg-gray-100 text-gray-800';

  return (
    <div className="relative" ref={anchorRef}>
      <button onClick={openMenu} className={triggerClass} aria-haspopup="menu" aria-expanded={open}>
        {selected?.label || 'Auswählen'}
        <ChevronDown className="h-3 w-3 inline ml-1" />
      </button>

      {open && coords &&
        createPortal(
          <div
            className="fixed z-[100000] w-48 bg-white border border-gray-200 rounded-md shadow-lg"
            style={{
              left: coords.left,
              top: dropUp ? coords.top - 6 : coords.top + coords.height + 6,
              transform: dropUp ? 'translateY(-100%)' : 'none',
            }}
            role="menu"
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
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelect(item.id);
                    setOpen(false);
                  }}
                  role="menuitemradio"
                  aria-checked={item.id === selectedId}
                  className={(getItemClassName || defaultGetItemClassName)(item, item.id === selectedId)}
                >
                  <span className="inline-flex items-center gap-2">
                    {item.color ? (
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
          </div>,
          document.body
        )}
    </div>
  );
}


