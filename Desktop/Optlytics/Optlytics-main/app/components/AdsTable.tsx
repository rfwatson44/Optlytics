"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { ADS_COLUMN_MAP } from "./adsColumnMap";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type StandardColumn = { label: string; getValue: (row: any) => any };
type CustomConversionGroup = {
  type: 'custom_conversion_group';
  label: string;
  getCount: (row: any) => any;
  getCost: (row: any) => any;
};
type AdsTableColumn = StandardColumn | CustomConversionGroup;

interface AdsTableProps {
  columns?: AdsTableColumn[];
}

export default function AdsTable({ columns }: AdsTableProps) {
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAd() {
      setLoading(true);
      setError(null);
      // Select all columns needed for formulas
      const { data, error } = await supabase
        .from("meta_ads")
        .select("name, spend, impressions, clicks, conversions")
        .eq("name", "Trendy Content - 0007")
        .limit(1);
      if (error) {
        setError(error.message);
        setAds([]);
      } else {
        setAds(data || []);
      }
      setLoading(false);
    }
    fetchAd();
  }, []);

  if (loading) {
    return <div className="p-4">Loading ad data...</div>;
  }
  if (error) {
    return <div className="p-4 text-red-600">Error: {error}</div>;
  }
  const displayColumns = columns && columns.length > 0 ? columns : ADS_COLUMN_MAP;

  // Build groupedColumns for the first header row and flatColumns for the second header row and body
  const groupedColumns = displayColumns;
  const flatColumns = displayColumns.flatMap(col =>
    'type' in col && col.type === 'custom_conversion_group'
      ? [
          { key: col.label + '-count', render: (row: any) => col.getCount(row) },
          { key: col.label + '-cost', render: (row: any) => col.getCost(row) }
        ]
      : [
          { key: col.label, render: (row: any) => ('getValue' in col && col.getValue ? col.getValue(row) : '') }
        ]
  );

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-100 dark:border-gray-800 overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800">
           {/* First header row: group custom conversions + cost */}
           <tr>
             {groupedColumns.map((col) =>
               'type' in col && col.type === 'custom_conversion_group'
                 ? (
                     <th
                       key={col.label}
                       colSpan={2}
                       className="px-4 py-2 text-center font-bold bg-green-50 dark:bg-green-900 border-x border-green-200 dark:border-green-800 rounded-t"
                     >
                       {col.label}
                     </th>
                   )
                 : (
                     <th
                       key={col.label}
                       rowSpan={2}
                       className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200"
                     >
                       {col.label}
                     </th>
                   )
             )}
           </tr>
           {/* Second header row: show Count/Cost for grouped pairs */}
           <tr>
             {groupedColumns.flatMap((col) =>
               'type' in col && col.type === 'custom_conversion_group'
                 ? [
                     <th key={col.label + '-count'} className="px-4 py-1 text-center text-xs font-medium text-gray-700 dark:text-gray-200 bg-green-50 dark:bg-green-900 border-x border-green-200 dark:border-green-800">Count</th>,
                     <th key={col.label + '-cost'} className="px-4 py-1 text-center text-xs font-medium text-gray-700 dark:text-gray-200 bg-green-50 dark:bg-green-900 border-x border-green-200 dark:border-green-800">Cost</th>
                   ]
                 : []
             )}
           </tr>
        </thead>
        <tbody>
            {ads.map((ad, i) => (
              <tr key={i} className="border-t border-gray-100 dark:border-gray-800 hover:bg-green-50 dark:hover:bg-green-950">
                {flatColumns.map(col => (
                  <td key={col.key} className="px-4 py-3">{col.render(ad)}</td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
