/**
 * Similar to SidebarGroupLabel from @/components/ui/sidebar.
 * If we start using the shadcn sidebar component, we can remove this.
 */
export function SidebarGroupLabel({ children }: { children: React.ReactNode }) {
  return <h4 className="mb-2 text-xs font-medium text-gray-700">{children}</h4>;
}
