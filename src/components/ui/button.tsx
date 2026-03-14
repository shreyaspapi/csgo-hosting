"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-sm border text-sm font-bold uppercase whitespace-nowrap transition-all outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "vgui-button text-primary-foreground",
        outline:
          "border-white/12 bg-[linear-gradient(180deg,rgba(82,85,79,0.78),rgba(44,46,43,0.92))] text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:border-primary/35 hover:text-primary",
        secondary:
          "border-white/10 bg-[linear-gradient(180deg,rgba(98,101,94,0.8),rgba(61,64,60,0.95))] text-secondary-foreground hover:text-primary",
        ghost:
          "border-transparent bg-transparent text-foreground hover:border-white/10 hover:bg-white/4 hover:text-primary",
        destructive:
          "border-destructive/30 bg-[linear-gradient(180deg,rgba(128,72,61,0.85),rgba(89,46,39,0.95))] text-[#ffe5dd] hover:border-destructive/60 hover:text-white",
        link: "border-transparent bg-transparent text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 gap-1.5 px-3 tracking-[0.12em]",
        xs: "h-6 gap-1 px-2 text-[11px] tracking-[0.12em]",
        sm: "h-8 gap-1 px-2.5 text-[11px] tracking-[0.12em]",
        lg: "h-11 gap-2 px-4 text-[0.82rem] tracking-[0.18em]",
        icon: "size-8",
        "icon-xs": "size-6",
        "icon-sm": "size-7",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  render,
  nativeButton,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  const resolvedNativeButton = nativeButton ?? (render ? false : undefined)

  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      render={render}
      nativeButton={resolvedNativeButton}
      {...props}
    />
  )
}

export { Button, buttonVariants }
