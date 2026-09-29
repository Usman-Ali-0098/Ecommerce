"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

type AdminSidebarContextValue = {
  open: boolean;
  toggle: () => void;
  close: () => void;
};

const AdminSidebarContext = createContext<AdminSidebarContextValue | null>(
  null,
);

export function AdminSidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const value: AdminSidebarContextValue = {
    open,
    toggle: () => setOpen((current) => !current),
    close: () => setOpen(false),
  };

  return (
    <AdminSidebarContext.Provider value={value}>
      {children}
    </AdminSidebarContext.Provider>
  );
}

export function useAdminSidebar() {
  const context = useContext(AdminSidebarContext);

  if (!context) {
    throw new Error(
      "useAdminSidebar must be used within an AdminSidebarProvider",
    );
  }

  return context;
}
