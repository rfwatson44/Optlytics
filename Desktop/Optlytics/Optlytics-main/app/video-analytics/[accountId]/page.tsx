"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import FiltersBar from "../../components/FiltersBar";
import MetricsBar from "../../components/MetricsBar";
import AdsTable from "../../components/AdsTable";
import { ADS_COLUMN_MAP, formatCurrency, formatNumber } from "../../components/adsColumnMap";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ALWAYS_ON_COLUMNS = [
  { label: "Ad Name", value: "ad_name" },
  { label: "Amount Spent", value: "amount_spent" },
];

const DEFAULT_METRICS = [
  { label: "Impressions", value: "impressions" },
  { label: "CTR", value: "ctr" },
];

export default function VideoAnalyticsPage() {
  const [ads, setAds] = useState<any[]>([]);
  const [customConversionKeys, setCustomConversionKeys] = useState<string[]>([]);

  const params = useParams();
  const { accountId } = params;
  const [accountName, setAccountName] = useState(accountId);

  useEffect(() => {
    async function fetchAccountName() {
      const { data } = await supabase
        .from("accounts")
        .select("account_name")
        .eq("account_id", accountId)
        .single();
      if (data) setAccountName(data.account_name);
    }
    fetchAccountName();
  }, [accountId]);

  // Fetch ads including conversions for custom conversion keys
  useEffect(() => {
    async function fetchAds() {
      const { data, error } = await supabase
        .from("meta_ads")
        .select("name, spend, impressions, clicks, conversions")
        .limit(100);
      if (data) {
        setAds(data);
        // Extract all unique custom conversion keys
        const keys = new Set<string>();
        data.forEach((row: any) => {
          if (row.conversions && typeof row.conversions === "object") {
            Object.keys(row.conversions).forEach((k) => keys.add(k));
          }
        });
        setCustomConversionKeys(Array.from(keys));
      }
    }
    fetchAds();
  }, [accountId]);

  const [metrics, setMetrics] = useState(DEFAULT_METRICS);

  // Don't allow always-on columns in metrics
  const METRIC_LABELS = [
    "Impressions",
    "Clicks",
    "CTR",
    "CPC",
    "Reach",
    "ROAS",
    "Purchases",
    "Cost Per Purchase",
    "Add to Cart",
    "App Installs",
    "Cost Per App Install",
    "Leads",
    "Cost Per Lead",
  ];

  // Only show metrics that are not already selected or always-on
  const allSelectedValues = new Set([
    ...ALWAYS_ON_COLUMNS.map(col => col.value),
    ...metrics.map(col => col.value)
  ]);

  const metricOptions = ADS_COLUMN_MAP.filter(
    col => METRIC_LABELS.includes(col.label) && !allSelectedValues.has(col.value)
  );

  const selectedColumns = useMemo(() => {
    const alwaysOn = ALWAYS_ON_COLUMNS.map((col) => {
      const mapCol = ADS_COLUMN_MAP.find((m) => m.value === col.value);
      // Always return a column with getValue
      return mapCol ? mapCol : { ...col, getValue: (row: any) => row[col.value] ?? '-' };
    });
    // Build columns, injecting a Cost column after each custom conversion metric
    const renderedColumns: any[] = [];
    for (let i = 0; i < metrics.length; ++i) {
      const metric = metrics[i];
      if (metric.value.startsWith('custom_conversion_')) {
        // Group count and cost for custom conversions
        renderedColumns.push({
          type: 'custom_conversion_group',
          label: metric.label,
          getCount: (row: any) => {
            const val = row.conversions && row.conversions[metric.label];
            return val != null && !isNaN(val) ? formatNumber(val) : '-';
          },
          getCost: (row: any) => {
            const conversions = row.conversions && row.conversions[metric.label];
            const spend = row.spend;
            if (conversions && spend && !isNaN(conversions) && conversions !== 0) {
              return formatCurrency(spend / conversions);
            }
            return '-';
          },
        });
      } else {
        renderedColumns.push(
          ADS_COLUMN_MAP.find((m) => m.value === metric.value) || metric
        );
      }
    }
    return [...alwaysOn, ...renderedColumns];
  }, [metrics]);

  const handleAddMetric = (metric: { label: string; value: string; getValue?: (row: any) => any }) => {
    setMetrics((prev) => {
      if (prev.some((m) => m.value === metric.value)) {
        return prev;
      }
      // If it's a custom conversion, add getValue
      if (metric.value.startsWith('custom_conversion_')) {
        const key = metric.label;
        return [
          ...prev,
          {
            ...metric,
            getValue: (row: any) =>
              row.conversions && row.conversions[key] !== undefined
                ? row.conversions[key]
                : '-',
          },
        ];
      }
      return [...prev, metric];
    });
  };

  // Remove always-on columns from metrics bar
  const metricsBarMetrics = metrics.filter(
    m => !ALWAYS_ON_COLUMNS.some(always => always.value === m.value)
  );

  const handleRemoveMetric = (value: string) => {
    setMetrics((prev) => prev.filter((m) => m.value !== value));
  };


  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <nav className="text-xs text-gray-500 mb-2">
        <Link href="/">Home</Link>
        {" > "}
        <span>{accountName}</span>
        {" > Video Analytics"}
      </nav>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Video Analysis</h1>
        <FiltersBar />
      </div>
      
      <MetricsBar
        metrics={metricsBarMetrics}
        onRemoveMetric={handleRemoveMetric}
        onAddMetric={handleAddMetric}
        metricOptions={metricOptions}
        customConversionKeys={customConversionKeys}
      />
      <AdsTable columns={selectedColumns} />
    </div>
  );
}
