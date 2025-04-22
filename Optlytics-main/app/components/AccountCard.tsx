import React from "react";
import Link from "next/link";

interface AccountCardProps {
  name: string;
  accountId: string;
  lastSync?: string;
  dataSince?: string;
}

export default function AccountCard({ name, accountId, lastSync, dataSince }: AccountCardProps) {
  return (
    <div className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-lg shadow px-6 py-4 mb-3 border border-gray-100 dark:border-gray-800">
      <div className="flex items-center gap-4">
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900">
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#2563eb" /></svg>
        </span>
        <div>
          <div className="font-semibold text-base text-gray-900 dark:text-gray-100">{name}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{accountId}</div>
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center">
        <div className="flex flex-col items-center gap-1">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {lastSync ? `Synced about ${lastSync}` : 'Sync status unavailable'}
          </div>
          <div className="flex items-center gap-1 text-xs text-green-700 dark:text-green-400">
            <svg width="16" height="16" fill="none" viewBox="0 0 16 16"><circle cx="8" cy="8" r="8" fill="#22c55e" /></svg>
            {dataSince ? `Data since ${dataSince}` : 'No data'}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end min-w-[180px] gap-2">
        <Link
          href={`/video-analytics/${accountId}`}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Video Analytics
        </Link>
        <Link
          href={`/static-analytics/${accountId}`}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
        >
          Static Analytics
        </Link>
      </div>
    </div>
  );
}
