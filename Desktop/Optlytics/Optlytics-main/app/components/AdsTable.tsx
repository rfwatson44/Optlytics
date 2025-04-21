"use client";

import React, { useEffect, useState } from "react";
import AdSummary from "./AdSummary";
import { formatCurrency, formatNumber } from "./adsColumnMap";
import { createClient } from "@supabase/supabase-js";
import { ADS_COLUMN_MAP } from "./adsColumnMap";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type StandardColumn = {
  label: string;
  value: string;
  getValue: (row: any) => any;
  isPreview?: boolean;
};
type CustomConversionGroup = {
  type: 'custom_conversion_group';
  label: string;
  value: string;
  getCount: (row: any) => any;
  getCost: (row: any) => any;
};
type AdsTableColumn = StandardColumn | CustomConversionGroup;

interface AdsTableProps {
  columns?: AdsTableColumn[];
  ads: any[];
}


export default function AdsTable({ columns, ads }: AdsTableProps) {
  // Always-on columns: Preview and Ad Name only
  const previewCol = ADS_COLUMN_MAP.find(col => col.value === 'preview');
  const adNameCol = ADS_COLUMN_MAP.find(col => col.value === 'ad_name');
  const alwaysOnColumns = [previewCol, adNameCol].filter(Boolean) as StandardColumn[];

  // All other columns are controlled by the columns prop
  const additionalColumns = (columns && columns.length > 0 ? columns : []).filter(col => col && col.value !== 'preview' && col.value !== 'ad_name');

  // Compose final display columns
  const displayColumns = [...alwaysOnColumns, ...additionalColumns];

  // Build groupedColumns for the first header row and flatColumns for the second header row and body
  const groupedColumns = displayColumns;
  const flatColumns = displayColumns.flatMap(col =>
    col && 'type' in col && col.type === 'custom_conversion_group'
      ? [
          { key: col.label + '-count', render: (row: any) => col.getCount(row) },
          { key: col.label + '-cost', render: (row: any) => col.getCost(row) }
        ]
      : col
        ? [
            { key: col.label, render: (row: any) => (
              ('isPreview' in col && col.isPreview)
                ? row.thumbnail_url
                  ? <img src={row.thumbnail_url} alt="Preview" className="w-12 h-12 max-w-[48px] max-h-[48px] object-cover rounded-md border mx-auto" />
                  : <span className="inline-block w-12 h-12 max-w-[48px] max-h-[48px] bg-gray-200 rounded-md flex items-center justify-center text-gray-400 mx-auto">-</span>
                : ('getValue' in col && col.getValue ? col.getValue(row) : '')
            ) }
          ]
        : []
  );

  const [modalAd, setModalAd] = useState<any | null>(null);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Helper: get raw value for sorting
  function getSortValue(ad: any, col: any) {
    if ('getValue' in col && typeof col.getValue === 'function') {
      const val = col.getValue(ad);
      // Try to parse numbers from formatted strings
      if (typeof val === 'string') {
        const num = parseFloat(val.replace(/[^0-9.-]+/g, ''));
        return isNaN(num) ? val : num;
      }
      return val;
    }
    if ('getCount' in col && typeof col.getCount === 'function') {
      return col.getCount(ad);
    }
    if ('getCost' in col && typeof col.getCost === 'function') {
      return col.getCost(ad);
    }
    return null;
  }

  // Sort ads if sortCol is set
  let sortedAds = ads;
  if (sortCol) {
    const col = displayColumns.find(c => c && c.value === sortCol);
    if (col) {
      sortedAds = [...ads].sort((a, b) => {
        const aVal = getSortValue(a, col);
        const bVal = getSortValue(b, col);
        // Handle null, undefined, or '-' as lowest
        if (aVal == null || aVal === '-') return 1;
        if (bVal == null || bVal === '-') return -1;
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
        }
        // Fallback to string compare
        return sortDir === 'desc'
          ? String(bVal).localeCompare(String(aVal))
          : String(aVal).localeCompare(String(bVal));
      });
    }
  }

  return (
    <>
      <div className="w-full overflow-x-auto">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-100 dark:border-gray-800">
          <table className="min-w-full border-collapse text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
             {/* First header row: group custom conversions + cost */}
             <tr>
             {/* Sticky left cell for details button */}
             <th className="px-2 py-3 text-left font-semibold text-gray-700 dark:text-gray-200 sticky left-0 z-10 bg-gray-50 dark:bg-gray-800" style={{ minWidth: 48, width: 48 }}></th>
             {groupedColumns.map((col) => {
                // Custom conversions header
                if ('type' in col && col.type === 'custom_conversion_group') {
                  return (
                    <th
                      key={col.label}
                      colSpan={2}
                      className="px-4 py-2 text-center font-bold bg-green-50 dark:bg-green-900 border-x border-green-200 dark:border-green-800 rounded-t"
                    >
                      {col.label}
                    </th>
                  );
                }
                // Ad Name and Preview: no sort
                if (col.value === 'preview' || col.value === 'ad_name') {
                  return (
                    <th
                      key={col.label}
                      rowSpan={2}
                      className={`px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200${col.value === 'preview' ? ' pl-4' : ''}`}
                      style={col.value === 'preview'
                        ? { minWidth: '56px', width: '56px' }
                        : col.value === 'ad_name'
                        ? { minWidth: '160px', width: '160px' }
                        : { minWidth: '100px' }}
                    >
                      <span style={col.value === 'ad_name' ? { display: 'inline-block', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } : {}}>{col.label}</span>
                    </th>
                  );
                }
                // Sortable metric columns
                return (
                  <th
                    key={col.label}
                    rowSpan={2}
                    className={`px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200 group cursor-pointer select-none ${sortCol === col.value ? 'bg-green-50 dark:bg-green-950' : ''}`}
                    style={{ minWidth: '100px' }}
                    onClick={() => {
                      setSortCol(col.value);
                      setSortDir(sortCol === col.value && sortDir === 'desc' ? 'asc' : 'desc');
                    }}
                  >
                    <span>{col.label}</span>
                    <span className="inline-block align-middle ml-1">
                      {/* Chevron icon */}
                      {sortCol === col.value ? (
                        sortDir === 'desc' ? (
                          <svg width="16" height="16" fill="none" viewBox="0 0 20 20" aria-hidden="true" className="inline"><path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        ) : (
                          <svg width="16" height="16" fill="none" viewBox="0 0 20 20" aria-hidden="true" className="inline"><path d="M6 12l4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        )
                      ) : (
                        <svg width="16" height="16" fill="none" viewBox="0 0 20 20" aria-hidden="true" className="opacity-40 inline"><path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      )}
                    </span>
                  </th>
                );
              })}
           </tr>
           {/* Second header row: show Count/Cost for grouped pairs */}
           <tr>
             {/* Empty cell for details button */}
             <th className="px-2 py-1 bg-gray-50 dark:bg-gray-800 sticky left-0 z-10"></th>
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
            {sortedAds.map((ad, i) => (
              <tr key={i} className="border-t border-gray-100 dark:border-gray-800 hover:bg-green-50 dark:hover:bg-green-950">
                {/* Details button on the far left, sticky */}
                <td className="px-2 py-3 sticky left-0 z-10 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800">
                  <button
                    className="rounded-full p-1 hover:bg-green-100 dark:hover:bg-green-900 focus:outline-none border border-gray-200 dark:border-gray-700 flex items-center justify-center"
                    title="Show details"
                    aria-label="Show details"
                    onClick={() => setModalAd(ad)}
                  >
                    {/* 3-dots icon */}
                    <svg width="20" height="20" fill="none" viewBox="0 0 20 20" aria-hidden="true">
                      <circle cx="10" cy="4" r="1.5" fill="currentColor" />
                      <circle cx="10" cy="10" r="1.5" fill="currentColor" />
                      <circle cx="10" cy="16" r="1.5" fill="currentColor" />
                    </svg>
                  </button>
                </td>
                {/* Render Preview column as the first column after details button */}
                <td className="px-4 py-3" style={{ minWidth: '56px', width: '56px' }}>
                  {ad.thumbnail_url ? (
                    <img src={ad.thumbnail_url} alt="Preview" className="w-12 h-12 max-w-[48px] max-h-[48px] object-cover rounded-md border mx-auto" />
                  ) : (
                    <span className="inline-block w-12 h-12 max-w-[48px] max-h-[48px] bg-gray-200 rounded-md flex items-center justify-center text-gray-400 mx-auto">-</span>
                  )}
                </td>
                {/* Render ad_name column */}
                {displayColumns.map((col) => {
                  if (!col) return null;
                  if (col.value === 'ad_name') {
                    return (
                      <td key={col.value} className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100" style={{ minWidth: '160px', maxWidth: '160px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {'getValue' in col && typeof col.getValue === 'function' ? col.getValue(ad) : ''}
                      </td>
                    );
                  }
                  return null;
                })}
                {/* Render metric columns, highlight sorted column */}
                {displayColumns.map((col) => {
                  if (!col) return null;
                  if (col.value === 'preview' || col.value === 'ad_name' || ('type' in col && col.type === 'custom_conversion_group')) return null;
                  const highlight = sortCol === col.value ? 'bg-green-50 dark:bg-green-950' : '';
                  return (
                    <td key={col.value} className={`px-4 py-3 ${highlight}`}>
                      {'getValue' in col && typeof col.getValue === 'function' ? col.getValue(ad) : ''}
                    </td>
                  );
                })}
                {/* Render custom conversion columns (Count/Cost) */}
                {displayColumns.map((col) => {
                  if (!col) return null;
                  if ('type' in col && col.type === 'custom_conversion_group') {
                    return [
                      <td key={col.value + '-count'} className="px-4 py-3 text-center">
                        {typeof col.getCount === 'function' ? col.getCount(ad) : ''}
                      </td>,
                      <td key={col.value + '-cost'} className="px-4 py-3 text-center">
                        {typeof col.getCost === 'function' ? col.getCost(ad) : ''}
                      </td>
                    ];
                  }
                  return null;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    {modalAd && (
      <AdSummary ad={modalAd} onClose={() => setModalAd(null)} />
    )}
    </>
  );
}
