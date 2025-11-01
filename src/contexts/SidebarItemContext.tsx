import { SidebarSection } from "@/components/notebook/sidebar-panels";
import { createContext, useContext, useState } from "react";

interface SidebarItemContextType {
  activeSection: SidebarSection | null;
  setActiveSection: (section: SidebarSection | null) => void;
}

export const SidebarItemContext = createContext<SidebarItemContextType | null>(
  null
);

export const useSidebarItem = () => {
  const context = useContext(SidebarItemContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarItemProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [activeSection, setActiveSection] = useState<SidebarSection | null>(
    null
  );
  return (
    <SidebarItemContext.Provider value={{ activeSection, setActiveSection }}>
      {children}
    </SidebarItemContext.Provider>
  );
};
