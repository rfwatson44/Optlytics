"use client";

import React, { useState } from "react";

const ALL_METRICS = [
  { label: "Amount Spent", value: "amount_spent" },
  { label: "Impressions", value: "impressions" },
  { label: "CPM (Cost Per Mille)", value: "cpm" },
  { label: "Clicks", value: "clicks" },
  { label: "CTR (Click Through Rate)", value: "ctr" },
  { label: "CPC (Cost Per Click)", value: "cpc" },
  { label: "Outbound Clicks", value: "outbound_clicks" },
  { label: "CPC (Cost Per Outbound Click)", value: "cpc_outbound" },
  { label: "CTR (Outbound Click Through Rate)", value: "ctr_outbound" },
  { label: "Estimated ad recallers", value: "ad_recallers" },
];

interface MetricsDropdownProps {
  onAddMetric: (metric: { label: string; value: string }) => void;
  selectedMetrics: { label: string; value: string }[];
}

export default function MetricsDropdown({ onAddMetric, selectedMetrics }: MetricsDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = ALL_METRICS.filter(
    (m) =>
      m.label.toLowerCase().includes(search.toLowerCase()) &&
      !selectedMetrics.some((sel) => sel.value === m.value)
  );

  return (
    <div className="relative">
      <button
        className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded text-sm font-medium shadow hover:bg-green-700 transition"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        + Add metric
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-20 p-2">
          <input
            className="w-full px-3 py-2 mb-2 border border-gray-300 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200"
            placeholder="Search metric..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <div className="max-h-56 overflow-y-auto pr-1">
            <div className="font-semibold text-xs text-gray-500 mb-1">Performance metrics</div>
            {filtered.length === 0 && (
              <div className="text-xs text-gray-400 px-4 py-2">No metrics found</div>
            )}
            {filtered.map((metric) => (
              <label key={metric.value} className="flex items-center px-3 py-2 hover:bg-green-50 dark:hover:bg-green-950 rounded cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => {
                    onAddMetric(metric);
                    setOpen(false);
                  }}
                  className="mr-2 accent-green-600"
                />
                {metric.label}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
