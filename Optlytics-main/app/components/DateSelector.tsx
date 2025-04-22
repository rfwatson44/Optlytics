"use client";

import React, { useState } from "react";

const PRESETS = [
  { label: "Since 1 Nov, 2022", value: "2022-11-01" },
  { label: "Last 7 days", value: "last7" },
  { label: "Last 30 days", value: "last30" },
  { label: "This month", value: "thisMonth" },
  { label: "Custom", value: "custom" },
];

export default function DateSelector() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(PRESETS[0].value);

  return (
    <div className="relative">
      <button
        className="flex items-center px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        {PRESETS.find((p) => p.value === selected)?.label}
        <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-10">
          {PRESETS.map((preset) => (
            <button
              key={preset.value}
              className={`block w-full text-left px-4 py-2 text-sm hover:bg-green-50 dark:hover:bg-green-950 ${selected === preset.value ? 'bg-green-100 dark:bg-green-900' : ''}`}
              onClick={() => {
                setSelected(preset.value);
                setOpen(false);
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
