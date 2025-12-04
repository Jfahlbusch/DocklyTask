import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const cardVariants = cva(
  "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border shadow-sm transition-all duration-200",
  {
    variants: {
      variant: {
        default: "",
        interactive: "hover-lift hover:shadow-lg hover:border-primary/20 cursor-pointer",
        glass: "glass border-white/20 dark:border-white/10",
        gradient: "gradient-border overflow-hidden",
        elevated: "shadow-soft hover:shadow-lg",
        glow: "hover-glow",
      },
      padding: {
        default: "py-6",
        compact: "py-4",
        none: "",
      }
    },
    defaultVariants: {
      variant: "default",
      padding: "default",
    },
  }
)

interface CardProps 
  extends React.ComponentProps<"div">,
    VariantProps<typeof cardVariants> {}

function Card({ className, variant, padding, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      className={cn(cardVariants({ variant, padding, className }))}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold tracking-tight", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

// ============================================
// 🎨 SPECIALIZED CARD COMPONENTS
// ============================================

interface StatsCardProps extends React.ComponentProps<"div"> {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    positive: boolean;
  };
  gradient?: string;
}

function StatsCard({ 
  title, 
  value, 
  description, 
  icon, 
  trend,
  gradient = "from-primary/10 to-primary/5",
  className, 
  ...props 
}: StatsCardProps) {
  return (
    <Card 
      variant="interactive" 
      padding="compact"
      className={cn("relative overflow-hidden group", className)}
      {...props}
    >
      {/* Background Decoration */}
      <div className={cn(
        "absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-12 translate-x-12",
        "bg-gradient-to-br opacity-50 group-hover:opacity-70 transition-opacity duration-300",
        gradient
      )} />
      
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          {icon && (
            <div className={cn(
              "w-11 h-11 rounded-xl flex items-center justify-center",
              "bg-primary/10 text-primary",
              "group-hover:scale-110 transition-transform duration-300"
            )}>
              {icon}
            </div>
          )}
          {trend && (
            <span className={cn(
              "text-xs font-medium px-2 py-1 rounded-full",
              trend.positive 
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            )}>
              {trend.value}
            </span>
          )}
        </div>
        
        <div className="mt-4">
          <span className="text-3xl font-bold tracking-tight">{value}</span>
        </div>
        
        <p className="text-sm text-muted-foreground mt-1">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}

interface FeatureCardProps extends React.ComponentProps<"div"> {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

function FeatureCard({ 
  title, 
  description, 
  icon, 
  className, 
  ...props 
}: FeatureCardProps) {
  return (
    <Card 
      variant="interactive"
      className={cn("group", className)}
      {...props}
    >
      <CardContent className="pt-6">
        {icon && (
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
            "bg-gradient-to-br from-primary to-primary/80",
            "text-primary-foreground shadow-lg shadow-primary/25",
            "group-hover:scale-110 group-hover:rotate-3 transition-all duration-300"
          )}>
            {icon}
          </div>
        )}
        <CardTitle className="text-lg group-hover:text-primary transition-colors">
          {title}
        </CardTitle>
        <CardDescription className="mt-2">
          {description}
        </CardDescription>
      </CardContent>
    </Card>
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  StatsCard,
  FeatureCard,
  cardVariants,
}
