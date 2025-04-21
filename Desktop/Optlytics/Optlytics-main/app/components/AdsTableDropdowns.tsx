import React, { useState, ReactNode } from "react";

export function DropdownSection({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border rounded-lg bg-gray-50 dark:bg-gray-800">
      <button
        className="w-full flex items-center justify-between px-4 py-2 text-left font-semibold text-gray-800 dark:text-gray-100 focus:outline-none"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span>{title}</span>
        <span className="ml-2 text-lg">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="px-4 pb-3 pt-1 space-y-2">{children}</div>}
    </div>
  );
}

export function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</span>
      <span className="text-xs text-gray-900 dark:text-white font-mono text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}
