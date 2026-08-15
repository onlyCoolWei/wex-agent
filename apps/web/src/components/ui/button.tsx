import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap transition-[transform,background,opacity] focus-visible:outline-none disabled:pointer-events-none",
  {
    variants: {
      variant: {
        default:
          "h-[42px] rounded-[4px] bg-ink px-[17px] text-[13px] font-semibold text-white shadow-[0_5px_12px_rgba(25,30,25,0.13)] hover:-translate-y-px hover:bg-[#343933] disabled:opacity-60",
        outline:
          "h-[42px] rounded-[4px] border border-[#cfd3cc] bg-white px-[17px] text-[13px] font-semibold hover:-translate-y-px hover:bg-[#f4f6f1] disabled:opacity-60",
        ghost: "size-8 rounded-[4px] hover:bg-[#ecefe9]",
        send: "size-[30px] rounded-[4px] bg-ink text-white hover:bg-[#343933] disabled:bg-[#eceeea] disabled:text-[#aeb3ac]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant }), className)} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
