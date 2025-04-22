"use client";

import React, { useState } from "react";

// ALL_METRICS is now passed as metricOptions prop


interface MetricsDropdownProps {
  onAddMetric: (metric: { label: string; value: string; getValue?: (row: Record<string, unknown>) => unknown }) => void;
  selectedMetrics: { label: string; value: string }[];
  metricOptions: { label: string; value: string }[];
  customConversionKeys?: string[];
}

export default function MetricsDropdown({ onAddMetric, selectedMetrics, metricOptions, customConversionKeys }: MetricsDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showCustomConversions, setShowCustomConversions] = useState(false);

  const filtered = metricOptions.filter(
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
              <button
                key={metric.value}
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-green-50 dark:hover:bg-green-950 rounded text-sm cursor-pointer"
                onClick={() => {
                  onAddMetric(metric);
                  setOpen(false);
                }}
              >
                {metric.label}
              </button>
            ))}
            {/* Custom Conversions Sub-dropdown */}
            {(customConversionKeys ?? []).length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  className={`w-full text-left px-3 py-2 rounded text-sm cursor-pointer font-semibold border transition-colors ${showCustomConversions ? 'bg-green-50 border-green-200' : 'border-transparent hover:bg-green-50 hover:border-green-100'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCustomConversions((v) => !v);
                  }}
                  aria-haspopup="menu"
                  aria-expanded={showCustomConversions}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setShowCustomConversions(false);
                  }}
                >
                  Custom Conversions

                </button>
                {showCustomConversions && (
                  <div
                    className="absolute left-0 top-full mt-1 w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-40 p-2 focus:outline-none"
                    style={{ minHeight: 40, maxHeight: 300, overflowY: 'auto' }}
                    tabIndex={-1}
                  >
                    <div className="border-t border-gray-200 my-2" />
                    <div className="font-semibold text-xs text-gray-500 mb-1">Custom Conversions</div>
                    {(customConversionKeys ?? []).length === 0 ? (
                      <div className="text-xs text-gray-400 px-4 py-2">No custom conversions found for this account.</div>
                    ) : (
                      (customConversionKeys ?? []).map((key: string) => {
  // Example values: Try to show from the first ad if available
  let exampleConversion = '-';
  let exampleCost = '-';
  if (typeof window !== 'undefined') {
    // Try to get the first ad from the table if available
    const adsTable = document.querySelector('[data-ads-table]');
    if (adsTable) {
      // Try to get data from a global variable, or this can be improved by passing ads as prop
      const ads = (window as any).OPTLYTICS_ADS || [];
      if (ads.length > 0) {
        const ad = ads[0];
        if (ad.conversions && ad.conversions[key] !== undefined) {
          exampleConversion = require('./adsColumnMap').formatNumber(ad.conversions[key]);
          if (ad.spend && ad.conversions[key] > 0) {
            exampleCost = require('./adsColumnMap').formatCurrency(ad.spend / ad.conversions[key]);
          }
        }
      }
    }
  }
  return (
    <button
      key={key}
      type="button"
      className="w-full text-left px-3 py-2 hover:bg-green-50 dark:hover:bg-green-950 rounded text-sm cursor-pointer flex items-center justify-between"
      onClick={() => {
        onAddMetric({
  label: key,
  value: `custom_conversion_${key}`,
  getValue: (row: Record<string, unknown>) => {
    const conversions = row.conversions as Record<string, number> | undefined;
    return conversions && conversions[key] !== undefined
      ? require('./adsColumnMap').formatNumber(conversions[key])
      : "-";
  },
});
        setOpen(false);
        setShowCustomConversions(false);
      }}
    >
      <span className="flex-1">{key}</span>
      <span className="w-16 text-right font-mono text-xs text-gray-700 dark:text-gray-200">{exampleConversion}</span>
      <span className="w-20 text-right font-mono text-xs text-gray-700 dark:text-gray-400 pl-2">{exampleCost}</span>
    </button>
  );
})
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
