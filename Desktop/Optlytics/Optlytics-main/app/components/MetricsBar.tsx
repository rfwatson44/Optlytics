"use client";

import React, { useState } from "react";
import MetricsDropdown from "./MetricsDropdown";

const DEFAULT_METRICS = [
  { label: "App Installs", value: "app_installs" },
  { label: "Add to Cart", value: "add_to_cart" },
  { label: "Leads", value: "leads" },
  { label: "Amount Spent", value: "amount_spent" },
];

export default function MetricsBar() {
  const [metrics, setMetrics] = useState(DEFAULT_METRICS);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <div className="flex items-center gap-2 mb-6 flex-wrap">
      {metrics.map((metric) => (
        <span key={metric.value} className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 px-3 py-1 rounded text-sm font-medium flex items-center gap-1">
          {metric.label}
        </span>
      ))}
      <MetricsDropdown
        onAddMetric={(metric) => setMetrics((prev) => [...prev, metric])}
        selectedMetrics={metrics}
      />
    </div>
  );
}
