'use client';

import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onActionClick?: () => void;
  actionIcon?: ReactNode;
  className?: string;
}

export default function SectionHeader({
  title,
  actionLabel,
  onActionClick,
  actionIcon,
  className,
}: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between ${className ?? ''}`}>
      <h4 className="font-medium text-sm">{title}</h4>
      {actionLabel && onActionClick && (
        <Button variant="outline" size="sm" onClick={onActionClick} className="text-xs">
          {actionIcon}
          {actionLabel}
        </Button>
      )}
    </div>
  );
}


