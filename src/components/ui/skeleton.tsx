import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'circular' | 'text';
}

function Skeleton({
  className,
  variant = 'default',
  ...props
}: SkeletonProps) {
  const variantClasses = {
    default: 'rounded-md',
    circular: 'rounded-full',
    text: 'rounded h-4',
  }

  return (
    <div
      className={cn(
        "animate-pulse bg-muted shimmer",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  )
}

// ============================================
// 🎭 SKELETON COMPOSITIONS
// ============================================

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("p-6 rounded-xl border bg-card", className)}>
      <div className="flex items-center space-x-4">
        <Skeleton variant="circular" className="h-12 w-12" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </div>
    </div>
  )
}

function SkeletonStats({ className }: { className?: string }) {
  return (
    <div className={cn("p-6 rounded-xl border bg-card", className)}>
      <div className="flex items-start justify-between">
        <Skeleton variant="circular" className="h-11 w-11 rounded-xl" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <div className="mt-4">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-4 w-32 mt-2" />
      </div>
    </div>
  )
}

function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex gap-4 p-4 border-b">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 p-4 border-b last:border-0">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton 
              key={colIndex} 
              className={cn(
                "h-4 flex-1",
                colIndex === 0 && "max-w-[120px]"
              )} 
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function SkeletonList({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
          <Skeleton variant="circular" className="h-10 w-10" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      ))}
    </div>
  )
}

function SkeletonKanbanColumn({ cards = 3 }: { cards?: number }) {
  return (
    <div className="w-80 flex-shrink-0 bg-muted/30 rounded-2xl p-3 border">
      {/* Column Header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <Skeleton variant="circular" className="h-3 w-3" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-6 ml-auto rounded-full" />
      </div>
      
      {/* Cards */}
      <div className="space-y-2">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="p-3 rounded-lg bg-card border">
            <Skeleton className="h-3 w-12 mb-2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4 mt-1" />
            <div className="flex items-center gap-2 mt-3">
              <Skeleton variant="circular" className="h-6 w-6" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-12 ml-auto rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export { 
  Skeleton, 
  SkeletonCard, 
  SkeletonStats, 
  SkeletonTable, 
  SkeletonList,
  SkeletonKanbanColumn 
}
