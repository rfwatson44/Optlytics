import React, { createContext, useContext, useState } from "react";

interface HeaderContextType {
  breadcrumb: React.ReactNode;
  title: string;
  setHeader: (breadcrumb: React.ReactNode, title: string) => void;
}

const HeaderContext = createContext<HeaderContextType | undefined>(undefined);

export function HeaderProvider({ children }: { children: React.ReactNode }) {
  const [breadcrumb, setBreadcrumb] = useState<React.ReactNode>(<span>Home</span>);
  const [title, setTitle] = useState("Home");

  const setHeader = React.useCallback((bc: React.ReactNode, t: string) => {
    setBreadcrumb(bc);
    setTitle(t);
  }, []);

  return (
    <HeaderContext.Provider value={{ breadcrumb, title, setHeader }}>
      {children}
    </HeaderContext.Provider>
  );
}

export function useHeader() {
  const ctx = useContext(HeaderContext);
  if (!ctx) throw new Error("useHeader must be used within a HeaderProvider");
  return ctx;
}
