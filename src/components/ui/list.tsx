
import * as React from "react"
import { cn } from "@/lib/utils"

const List = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("space-y-2", className)}
    {...props}
  />
))
List.displayName = "List"

const ListHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("font-medium text-sm text-gray-700 mb-3", className)}
    {...props}
  />
))
ListHeader.displayName = "ListHeader"

const ListItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("border rounded-lg p-3 bg-white shadow-sm", className)}
    {...props}
  />
))
ListItem.displayName = "ListItem"

export { List, ListHeader, ListItem }
