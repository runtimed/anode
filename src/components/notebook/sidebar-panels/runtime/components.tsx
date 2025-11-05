import { cn } from "@/lib/utils";

/**
 * Similar to SidebarGroupLabel from @/components/ui/sidebar.
 * If we start using the shadcn sidebar component, we can remove this.
 */
export function SidebarGroupLabel({
  size = "xs",
  children,
}: {
  size?: "sm" | "xs";
  children: React.ReactNode;
}) {
  return (
    <h4
      className={cn(
        "mb-2 text-xs font-medium text-gray-700",
        size === "sm" ? "text-sm" : "text-xs"
      )}
    >
      {children}
    </h4>
  );
}
