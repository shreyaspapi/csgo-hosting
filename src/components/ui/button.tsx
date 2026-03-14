"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center border-t border-l border-white/10 text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-all outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 shadow-[2px_2px_0px_rgba(0,0,0,0.5)] active:translate-y-[1px] active:translate-x-[1px] active:shadow-none",
  {
    variants: {
      variant: {
        default: 
          "bg-gradient-to-b from-[#4c4c4c] to-[#3a3a3a] text-foreground border border-[#555] hover:border-primary hover:text-primary shadow-[inset_1px_1px_0px_rgba(255,255,255,0.1)]",
        outline:
          "border border-border bg-transparent hover:bg-primary/10 hover:text-primary hover:border-primary",
        secondary:
          "bg-[#4a4a4a] text-foreground hover:bg-[#5a5a5a] border border-[#555]",
        ghost:
          "hover:text-primary hover:translate-x-1 border-none shadow-none active:translate-x-1.5 active:translate-y-0",
        destructive:
          "bg-gradient-to-b from-[#af3e3e] to-[#8a2e2e] text-white border border-[#9a3a3a] hover:brightness-110 shadow-[inset_1px_1px_0px_rgba(255,255,255,0.1)]",
        link: "text-primary underline-offset-4 hover:underline border-none shadow-none",
      },
      size: {
        default: "h-9 px-4 py-2",
        xs: "h-6 px-2 text-xs",
        sm: "h-7 px-3 text-[0.8rem]",
        lg: "h-11 px-8 text-base",
        icon: "size-9",
        "icon-xs": "size-6",
        "icon-sm": "size-7",
        "icon-lg": "size-11",
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
  // When rendering as a non-button element (link, anchor), tell Base UI
  // not to expect native <button> semantics to suppress the console warning.
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
