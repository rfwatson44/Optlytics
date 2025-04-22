'use client';

import Link from 'next/link';
import { useAuth } from '../auth/AuthContext';

import HeaderBar from "./HeaderBar";
import { useHeader } from "./HeaderContext";

export default function AuthNav() {
  const { user, profile, signOut } = useAuth();
  const { breadcrumb, title } = useHeader();

  return (
    <nav className="flex items-center justify-between gap-4 p-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-black w-full">
      <HeaderBar breadcrumb={breadcrumb} title={title} />
      {!user && (
        <div className="flex gap-2 ml-auto">
          <Link href="/auth/login">Login</Link>
          <Link href="/auth/register">Register</Link>
        </div>
      )}
      {user && (
        <div className="flex flex-col items-end ml-8">
          <button
            onClick={signOut}
            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
          >
            Sign Out
          </button>
          <span className="mt-1 text-xs text-gray-500 dark:text-gray-300">{user.email}</span>
        </div>
      )}
    </nav>
  );
}

