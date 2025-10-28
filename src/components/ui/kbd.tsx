import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const kbdVariants = cva(
  "pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-sm px-1 font-sans text-xs font-medium select-none [&_svg:not([class*='size-'])]:size-3",
  {
    variants: {
      variant: {
        default:
          "bg-muted text-muted-foreground dark:bg-muted/50 dark:text-muted-foreground/80",
        dark: "bg-background/20 text-background dark:bg-background/10 dark:text-background/90",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Kbd({
  className,
  variant,
  ...props
}: React.ComponentProps<"kbd"> & VariantProps<typeof kbdVariants>) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(kbdVariants({ variant }), className)}
      {...props}
    />
  );
}

function KbdGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="kbd-group"
      className={cn("inline-flex items-center gap-1", className)}
      {...props}
    />
  );
}

export { Kbd, KbdGroup, kbdVariants };
