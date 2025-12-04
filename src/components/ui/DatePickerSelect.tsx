'use client';

import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { CalendarDays } from 'lucide-react';

interface DatePickerSelectProps {
  label?: string;
  selected?: Date | null;
  onSelect: (date: Date | null) => void;
  className?: string;
  inline?: boolean;
  variant?: 'popover' | 'modal';
  modalClassName?: string;
}

export default function DatePickerSelect({ label, selected, onSelect, className, inline = false, variant = 'popover', modalClassName }: DatePickerSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (date: Date | undefined) => {
    const value = date ?? null;
    onSelect(value);
    setOpen(false);
  };

  if (inline) {
    return (
      <Calendar
        mode="single"
        selected={selected ?? undefined}
        onSelect={handleSelect}
        captionLayout="dropdown"
        fromYear={2000}
        toYear={2100}
        initialFocus
        currentSelection={selected ?? undefined}
        inline
      />
    );
  }

  if (variant === 'modal') {
    return (
      <>
        <Button variant="ghost" size="sm" className={`h-7 px-2 inline-flex items-center gap-1 ${className || ''}`} onClick={() => setOpen(true)}>
          <CalendarDays className="h-4 w-4" />
          <span className="text-sm">{selected ? selected.toLocaleDateString('de-DE') : (label || 'Datum wählen')}</span>
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent showCloseButton={false} className={`z-[60] w-auto p-2 ${modalClassName || ''}`}>
            <DialogHeader className="sr-only">
              <DialogTitle>Datum auswählen</DialogTitle>
            </DialogHeader>
            <Calendar
              mode="single"
              selected={selected ?? undefined}
              onSelect={handleSelect}
              captionLayout="dropdown"
              fromYear={2000}
              toYear={2100}
              initialFocus
              currentSelection={selected ?? undefined}
              inline
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className={`h-7 px-2 inline-flex items-center gap-1 ${className || ''}`}>
          <CalendarDays className="h-4 w-4" />
          <span className="text-sm">
            {selected ? selected.toLocaleDateString('de-DE') : (label || 'Datum wählen')}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-2 z-[100000]">
        <Calendar
          mode="single"
          selected={selected ?? undefined}
          onSelect={handleSelect}
          captionLayout="dropdown"
          fromYear={2000}
          toYear={2100}
          initialFocus
          currentSelection={selected ?? undefined}
          inline={false}
        />
      </PopoverContent>
    </Popover>
  );
}


