import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-[rgba(22,20,31,0.12)] bg-[rgba(255,255,255,0.7)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--muted)]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(202,108,67,0.3)] disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
