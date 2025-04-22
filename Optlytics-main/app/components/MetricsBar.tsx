"use client";

import React, { useState } from "react";
import MetricsDropdown from "./MetricsDropdown";

const DEFAULT_METRICS = [
  { label: "App Installs", value: "app_installs" },
  { label: "Add to Cart", value: "add_to_cart" },
  { label: "Leads", value: "leads" },
  { label: "Amount Spent", value: "amount_spent" },
];

interface MetricsBarProps {
  metrics: { label: string; value: string }[];
  onRemoveMetric: (value: string) => void;
  onAddMetric: (metric: { label: string; value: string }) => void;
  metricOptions: { label: string; value: string }[];
  customConversionKeys?: string[];
}

export default function MetricsBar({ metrics, onRemoveMetric, onAddMetric, metricOptions, customConversionKeys }: MetricsBarProps) {
  return (
    <div className="flex items-center gap-2 mb-6 flex-wrap">
      {metrics.map((metric) => (
        <span key={metric.value} className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 px-3 py-1 rounded text-sm font-medium flex items-center gap-1">
          {metric.label}
          <button
            onClick={() => onRemoveMetric(metric.value)}
            className="ml-1 text-green-900 dark:text-green-200 hover:text-red-600 focus:outline-none"
            aria-label={`Remove ${metric.label}`}
            type="button"
          >
            &times;
          </button>
        </span>
      ))}
      <MetricsDropdown
        onAddMetric={onAddMetric}
        selectedMetrics={[{ label: "Ad Name", value: "Ad Name" }, { label: "Amount Spent", value: "Amount Spent" }, ...metrics]}
        metricOptions={metricOptions}
        customConversionKeys={customConversionKeys}
      />
    </div>
  );
}
