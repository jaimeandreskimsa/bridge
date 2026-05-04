import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[#0F1C3F] text-white shadow-sm hover:bg-[#1a2f4a] hover:shadow-md",
        gold:
          "bg-gradient-to-r from-[#C9A23A] to-[#9A7C28] text-white shadow-sm hover:opacity-90 hover:shadow-md",
        destructive:
          "bg-red-500 text-white shadow-sm hover:bg-red-600",
        outline:
          "border-2 border-[#0F1C3F] bg-transparent text-[#0F1C3F] hover:bg-[#0F1C3F]/[0.06]",
        "outline-gold":
          "border-2 border-[#C9A23A] bg-transparent text-[#9A7C28] hover:bg-[#C9A23A]/[0.08]",
        secondary:
          "bg-slate-100 text-slate-700 shadow-sm hover:bg-slate-200",
        ghost:
          "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
        link:
          "text-[#0F1C3F] underline-offset-4 hover:underline p-0 h-auto shadow-none rounded-none active:scale-100",
        bridge:
          "bg-[#0F1C3F] text-white shadow-sm hover:bg-[#1a2f4a] hover:shadow-md",
        card:
          "bg-white border border-slate-200 text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:shadow",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-2xl px-10 text-base",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, isLoading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
