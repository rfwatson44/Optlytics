"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import FiltersBar from "../../../components/FiltersBar";
import MetricsBar from "../../../components/MetricsBar";
import AdsTable from "../../../components/AdsTable";
import { ADS_COLUMN_MAP, formatCurrency, formatNumber } from "../../../components/adsColumnMap";
import { useHeader } from "../../../components/HeaderContext";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

import type { Ad } from '../../../components/AdsTable';

type Metric = {
  label: string;
  value: string;
  getValue: (row: Ad) => React.ReactNode;
  isPreview?: boolean;
};



const ALWAYS_ON_COLUMNS: Metric[] = [
  { label: "Preview", value: "preview", getValue: (row: any) => row.thumbnail_url || '', isPreview: true },
  { label: "Ad Name", value: "ad_name", getValue: (row: Ad) => row.name },
];

const DEFAULT_METRICS: Metric[] = [
  { label: "Amount Spent", value: "amount_spent", getValue: (row: Ad) => formatCurrency(row.spend ?? 0) },
  { label: "Impressions", value: "impressions", getValue: (row: Ad) => formatNumber(row.impressions ?? 0) },
  { label: "Clicks", value: "clicks", getValue: (row: Ad) => formatNumber(row.clicks ?? 0) },
  { label: "CTR", value: "ctr", getValue: (row: Ad) => {
    const clicks = row.clicks ?? 0;
    const impressions = row.impressions ?? 0;
    return impressions > 0 ? `${((clicks / impressions) * 100).toFixed(2)}%` : '-';
  } },
  { label: "CPC", value: "cpc", getValue: (row: Ad) => {
    const spend = row.spend ?? 0;
    const clicks = row.clicks ?? 0;
    return clicks > 0 ? formatCurrency(spend / clicks) : '-';
  } },
];

export default function VideoAnalyticsPage() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [customConversionKeys, setCustomConversionKeys] = useState<string[]>([]);

  const params = useParams();
  const { accountId } = params;
  const [accountName, setAccountName] = useState(accountId);

  const { setHeader } = useHeader();

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

  useEffect(() => {
    setHeader(
      <>
        <Link href="/">Home</Link> {'>'} <span>{accountName}</span> {'>'} <span>Video Analytics</span>
      </>,
      "Video Analysis"
    );
  }, [accountName, setHeader]);

  // Fetch ads including conversions for custom conversion keys
  useEffect(() => {
    async function fetchAds() {
      const { data, error } = await supabase
        .from("meta_ads")
        .select("name, spend, impressions, clicks, conversions, thumbnail_url, account_id")
        .eq("account_id", `act_${accountId}`)
        .limit(100);
      if (data) {
        setAds(data);
        // Extract all unique custom conversion keys
        const keys = new Set<string>();
        data.forEach((row: Ad) => {
          if (row.conversions && typeof row.conversions === "object") {
            Object.keys(row.conversions).forEach((k) => keys.add(k));
          }
        });
        setCustomConversionKeys(Array.from(keys));
      }
    }
    fetchAds();
  }, [accountId]);

  const [metrics, setMetrics] = useState<Metric[]>(DEFAULT_METRICS);

  const METRIC_LABELS = [
    "Amount Spent",
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

  // Only show metrics that are not already selected
  const allSelectedValues = new Set(metrics.map((col) => col.value));
  const metricOptions = ADS_COLUMN_MAP.filter(
    (col) => METRIC_LABELS.includes(col.label) && !allSelectedValues.has(col.value) && col.getValue !== undefined
  );

  const selectedColumns = useMemo(() => {
    // Always include Preview and Ad Name as the first two columns
    const renderedColumns: Metric[] = [...ALWAYS_ON_COLUMNS];
    for (let i = 0; i < metrics.length; ++i) {
      const metric = metrics[i];
      if (metric.value.startsWith("custom_conversion_")) {
        // Group count and cost for custom conversions
        renderedColumns.push({
          label: metric.label,
          value: metric.value,
          getValue: (row: Ad) => {
            const val = row.conversions && row.conversions[metric.label];
            return typeof val === 'number' && !isNaN(val) ? formatNumber(val) : '-';
          },
        });
      } else {
        const column = ADS_COLUMN_MAP.find((m) => m.value === metric.value);
        if (column && column.getValue !== undefined) {
          renderedColumns.push(column);
        }
      }
    }
    return renderedColumns;
  }, [metrics]);

  const handleAddMetric = (metric: { label: string; value: string }) => {
    setMetrics((prev) => {
      if (prev.some((m) => m.value === metric.value)) {
        return prev;
      }
      // If it's a custom conversion, add as simple metric
      if (metric.value.startsWith('custom_conversion_')) {
        const key = metric.label;
        return [
          ...prev,
          {
            ...metric,
            getValue: (row: Ad) =>
              row.conversions && row.conversions[key] !== undefined
                ? formatNumber(row.conversions[key])
                : '-',
          },
        ];
      }
      // Standard metric: get from DEFAULT_METRICS or fallback
      const found = DEFAULT_METRICS.find(m => m.value === metric.value);
      if (found) {
        return [...prev, found];
      }
      // Fallback: treat as string
      return [...prev, { ...metric, getValue: () => '-' }];
    });
  };

  const handleRemoveMetric = (value: string) => {
    setMetrics((prev) => prev.filter((m) => m.value !== value));
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">

      <FiltersBar />
      
      <MetricsBar
        metrics={metrics}
        onRemoveMetric={handleRemoveMetric}
        onAddMetric={handleAddMetric}
        metricOptions={metricOptions}
        customConversionKeys={customConversionKeys}
      />
      <AdsTable columns={selectedColumns} ads={ads} />
    </div>
  );
}
