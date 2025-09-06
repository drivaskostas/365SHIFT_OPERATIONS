import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl transition-all duration-300 hover:shadow-glow hover:scale-105",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl transition-all duration-300 hover:shadow-glow",
        outline:
          "border border-border/50 bg-background/50 hover:bg-accent hover:text-accent-foreground rounded-xl backdrop-blur-sm transition-all duration-300 hover:border-primary/50",
        secondary:
          "bg-secondary/80 text-secondary-foreground hover:bg-secondary backdrop-blur-sm rounded-xl transition-all duration-300 hover:shadow-card",
        ghost: "hover:bg-accent/50 hover:text-accent-foreground rounded-xl transition-all duration-300 backdrop-blur-sm",
        link: "text-primary underline-offset-4 hover:underline transition-all duration-300",
        gradient: "bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground shadow-lg hover:shadow-neon transition-all duration-300 rounded-xl border border-primary/20",
        glass: "btn-glass shadow-lg",
        success: "bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-glow transition-all duration-300 rounded-xl border border-green-500/20",
        warning: "bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg hover:shadow-glow transition-all duration-300 rounded-xl border border-yellow-500/20",
        tech: "btn-tech",
        cyber: "btn-cyber",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
        xl: "h-12 rounded-lg px-10 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
