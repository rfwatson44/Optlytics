"use client";

import { useAuth } from "../auth/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Sidebar from "../components/Sidebar";
import AuthNav from "../components/AuthNav";
import Providers from "../providers";
import { HeaderProvider } from "../components/HeaderContext";

export default function ClientDashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && profile && !profile.approved) {
      router.replace("/awaiting-approval");
    }
  }, [loading, profile, router]);

  if (loading || !profile) {
    return <div className="text-center mt-12">Loading...</div>;
  }
  if (!profile.approved) {
    return null;
  }
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 bg-white dark:bg-black ml-56">
        <Providers>
          <HeaderProvider>
            <AuthNav />
            <div className="p-6">
              {children}
            </div>
          </HeaderProvider>
        </Providers>
      </main>
    </div>
  );
}
