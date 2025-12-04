'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Users as UsersIcon, Check } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export interface UserSearchItem {
  id: string;
  name?: string;
  email?: string;
  avatar?: string;
}

interface UserSearchSelectProps {
  users: UserSearchItem[];
  selectedIds: string[];
  onChange: (nextSelectedIds: string[]) => void;
  placeholder?: string;
  triggerClassName?: string;
  triggerLabel?: React.ReactNode;
}

export default function UserSearchSelect({
  users,
  selectedIds,
  onChange,
  placeholder = 'Personen suchen…',
  triggerClassName,
  triggerLabel,
}: UserSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [dropUp, setDropUp] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  }, [users, query]);

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
            setDropUp(spaceBelow < 320);
          }
        } catch {}
      }
      return next;
    });
  };

  const getInitials = (raw?: string) => {
    const value = (raw || '').trim();
    if (!value) return '?';
    const emailIdx = value.indexOf('@');
    const base = emailIdx > 0 ? value.slice(0, emailIdx) : value;
    const parts = base.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    const letters = base.replace(/[^a-zA-Z]/g, '').slice(0, 2);
    return (letters || base[0] || '?').toUpperCase();
  };

  const triggerCls =
    triggerClassName ||
    'px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity border flex items-center gap-1';

  const toggleUser = (id: string) => {
    const set = new Set(selectedIds);
    if (set.has(id)) set.delete(id); else set.add(id);
    onChange(Array.from(set));
  };

  return (
    <div className="relative" ref={anchorRef} onMouseDown={(e) => e.stopPropagation()}>
      <button
        type="button"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); openMenu(); }}
        className={triggerCls}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Beobachter verwalten"
      >
        <UsersIcon className="h-4 w-4" />
        <span className="hidden sm:inline">{triggerLabel ?? 'Beobachter'}</span>
        <span className="ml-1 text-[10px] bg-gray-100 rounded px-1">{selectedIds.length}</span>
      </button>

      {open && (
        <div
          ref={menuRef}
          className="absolute z-[1000] w-72 bg-white border border-gray-200 rounded-md shadow-lg"
          style={{ left: 0, top: dropUp ? undefined : 'calc(100% + 6px)', bottom: dropUp ? 'calc(100% + 6px)' : undefined }}
          role="menu"
          onMouseDown={(e) => e.stopPropagation()}
        >
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
          <div className="py-1 max-h-[320px] overflow-auto">
            {filtered.map((u) => {
              const checked = selectedIds.includes(u.id);
              return (
                <button
                  key={u.id}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); toggleUser(u.id); }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center gap-2 ${checked ? 'bg-gray-50' : ''}`}
                  role="menuitemcheckbox"
                  aria-checked={checked}
                >
                  <span className={`h-4 w-4 inline-flex items-center justify-center rounded-sm border ${checked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-300 text-transparent'}`}>
                    <Check className="h-3 w-3" />
                  </span>
                  <Avatar className="h-6 w-6 border-0">
                    <AvatarImage src={u.avatar} />
                    <AvatarFallback>{getInitials(u.name || u.email)}</AvatarFallback>
                  </Avatar>
                  <span className="truncate">{u.name || u.email || 'Unbekannt'}</span>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-xs text-gray-500">Keine Ergebnisse</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


