"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../auth/AuthContext";

const accounts = [
  { name: "Mindful", id: "1114312039331153" },
  { name: "Zleaguegg", id: "604977370158225" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { profile } = useAuth();
  return (
    <aside className="bg-[#f6f8f5] dark:bg-[#181d17] w-56 min-h-screen border-r border-gray-200 dark:border-gray-800 flex flex-col p-4 fixed left-0 top-0 h-screen z-30">
      <div className="mb-8">
        <span className="font-bold text-lg text-green-800 dark:text-green-300">Optlytics</span>
      </div>
      <nav>
        <ul className="space-y-2">
          <li>
            <Link href="/" className={`flex items-center gap-2 px-3 py-2 rounded hover:bg-green-50 dark:hover:bg-green-950 transition font-medium ${pathname === '/' ? 'bg-green-100 dark:bg-green-900' : ''}`}>
              🏠 Home
            </Link>
          </li>
          {profile?.role === 'admin' && profile.approved && (
            <li>
              <Link href="/admin" className={`flex items-center gap-2 px-3 py-2 rounded hover:bg-green-50 dark:hover:bg-green-950 transition font-medium ${pathname === '/admin' ? 'bg-green-100 dark:bg-green-900' : ''}`}>
                🛠️ Admin
              </Link>
            </li>
          )}
        </ul>
      </nav>
      <div className="mt-8">
        <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Ad Accounts</div>
        <ul className="space-y-1">
          {accounts.map((account) => (
            <li key={account.id} className="text-sm text-gray-800 dark:text-gray-200">
              <span className="inline-flex items-center gap-2 px-2 py-1 rounded bg-gray-100 dark:bg-gray-800">
                <span className="text-green-600 dark:text-green-400">●</span>
                {account.name}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
