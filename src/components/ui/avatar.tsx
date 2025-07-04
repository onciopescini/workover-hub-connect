
import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { OptimizedImage } from "./OptimizedImage"
import { cn } from "@/lib/utils"

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image> & {
    enableWebP?: boolean;
    priority?: boolean;
    fallbackSrc?: string;
  }
>(({ className, enableWebP = true, priority = false, fallbackSrc, ...props }, ref) => (
  <OptimizedImage
    ref={ref}
    enableWebP={enableWebP}
    enableResponsive={true}
    priority={priority}
    fallbackSrc={fallbackSrc ?? '/images/placeholder.png'}
    quality={0.9}
    className={cn("aspect-square h-full w-full rounded-full", className)}
    onLoadComplete={() => {}} // Avatar load tracking removed for production
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
