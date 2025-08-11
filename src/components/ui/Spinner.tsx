import { cn } from "@/lib/utils";
import { LoaderIcon, type LucideProps } from "lucide-react";

type SpinnerProps = LucideProps & {
  size?: "sm" | "md" | "lg";
};

export const Spinner = ({ className, size = "sm", ...props }: SpinnerProps) => (
  <LoaderIcon
    className={cn("size-4 animate-spin", className, {
      "text-muted-foreground size-3": size === "sm",
      "text-muted-foreground/50 size-4": size === "md",
      "text-muted-foreground/70 size-6": size === "lg",
    })}
    {...props}
  />
);
