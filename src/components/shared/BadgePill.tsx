'use client';

import { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';

interface BadgePillProps {
  children: ReactNode;
  className?: string;
}

export default function BadgePill({ children, className }: BadgePillProps) {
  return (
    <Badge variant="outline" className={`text-xs ${className ?? ''}`}>{children}</Badge>
  );
}


