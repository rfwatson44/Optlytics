import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import Providers from "../providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Meta Marketing API Test",
  description: "Testing Meta Marketing API integration",
};

import Sidebar from "../components/Sidebar";
import { AuthProvider } from "../auth/AuthContext";
import AuthNav from "../components/AuthNav";

import ClientDashboardLayout from "./ClientDashboardLayout";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <ClientDashboardLayout>{children}</ClientDashboardLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
