import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "checked" | "onChange"> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    return (
      <span className="relative inline-flex h-4 w-4 shrink-0">
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          onChange={(event) => onCheckedChange(event.target.checked)}
          className={cn(
            "peer h-4 w-4 shrink-0 cursor-pointer appearance-none rounded-sm border border-primary shadow-sm checked:bg-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        />
        <Check className="pointer-events-none absolute inset-0 h-4 w-4 scale-0 text-primary-foreground transition-transform peer-checked:scale-100" />
      </span>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
