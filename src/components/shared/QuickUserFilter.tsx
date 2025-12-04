'use client';

import React from 'react';
import { User, UserRole } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import DropdownSelect from '@/components/ui/DropdownSelect';

export interface QuickUserFilterProps {
  users: User[];
  value: string; // 'all' | userId
  onChange: (next: string) => void;
  title?: string;
  className?: string;
}

function getInitials(raw?: string) {
  const value = (raw || '').trim();
  if (!value) return '?';
  const emailIdx = value.indexOf('@');
  const base = emailIdx > 0 ? value.slice(0, emailIdx) : value;
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  const letters = base.replace(/[^a-zA-Z]/g, '').slice(0, 2);
  return (letters || base[0] || '?').toUpperCase();
}

export default function QuickUserFilter({ users, value, onChange, title = 'Schnellfilter (Mitarbeiter)', className }: QuickUserFilterProps) {
  const adminManagers = users.filter((u) => u.role === UserRole.ADMIN || u.role === UserRole.MANAGER);
  const others = users.filter((u) => !(u.role === UserRole.ADMIN || u.role === UserRole.MANAGER));

  const selectedIsOther = others.some((u) => u.id === value);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 items-center">
          <Button
            variant={value === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChange('all')}
          >
            Alle Benutzer
          </Button>
          {adminManagers.map((user) => (
            <Button
              key={user.id}
              variant={value === user.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange(user.id)}
              className="flex items-center gap-2"
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={user.avatar} />
                <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              {user.name}
            </Button>
          ))}
          <DropdownSelect
            items={others.map((u) => ({
              id: u.id,
              label: u.name || u.email,
              icon: (
                <span className="inline-flex items-center justify-center">
                  <Avatar className="h-4 w-4 border-0">
                    <AvatarImage src={u.avatar} />
                    <AvatarFallback>{getInitials(u.name || u.email)}</AvatarFallback>
                  </Avatar>
                </span>
              ),
            }))}
            selectedId={selectedIsOther ? value : undefined}
            onSelect={(id) => onChange(id)}
            searchable
            placeholder="Benutzer suchen…"
            buttonClassName="px-2 py-1 rounded-full text-xs font-medium border cursor-pointer hover:opacity-80 transition-colors flex items-center gap-2"
          />
        </div>
      </CardContent>
    </Card>
  );
}


