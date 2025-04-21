import React, { useState } from "react";
import { formatCurrency, formatNumber } from "./adsColumnMap";

interface AdSummaryProps {
  ad: any;
  onClose: () => void;
}

const DROPDOWNS = ["Performance", "Custom Conversions", "Copy"] as const;
type DropdownType = typeof DROPDOWNS[number];

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : "rotate-0"}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export default function AdSummary({ ad, onClose }: AdSummaryProps) {
  const [openDropdown, setOpenDropdown] = useState<DropdownType | null>(null);

  function handleDropdownClick(type: DropdownType) {
    setOpenDropdown((prev) => (prev === type ? null : type));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur bg-black/60">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-5xl w-[950px] h-[650px] flex flex-col relative overflow-hidden">
        {/* Header with Ad Name */}
        <div className="w-full px-8 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="text-2xl font-bold text-gray-900 dark:text-white truncate" title={ad.name || ad.ad_name}>{ad.name || ad.ad_name}</div>
          <button
            className="text-gray-400 hover:text-gray-900 dark:hover:text-white text-2xl z-10"
            onClick={onClose}
            title="Close"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="flex flex-1 min-h-0">
          {/* Ad Preview */}
          <div className="w-1/2 min-w-[260px] flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-800">
            {ad.thumbnail_url ? (
              <img src={ad.thumbnail_url} alt="Ad Preview" className="rounded-lg w-80 h-80 object-cover shadow mb-4" />
            ) : (
              <div className="w-80 h-80 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center text-4xl text-gray-400 mb-4">?</div>
            )}
            {ad.landing_page && (
              <a href={ad.landing_page} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-300 underline truncate w-full text-center">{ad.landing_page}</a>
            )}
          </div>
          {/* Dropdowns */}
          <div className="w-1/2 flex flex-col p-8 h-full">
            <div className="flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
              {DROPDOWNS.map((type) => (
                <div key={type}>
                  <button
                    className="w-full flex items-center justify-between py-3 px-1 text-base font-medium text-gray-700 dark:text-gray-100 focus:outline-none border-b border-gray-200 dark:border-gray-700"
                    onClick={() => handleDropdownClick(type)}
                    aria-expanded={openDropdown === type}
                  >
                    <span>{type}</span>
                    <Chevron open={openDropdown === type} />
                  </button>
                  {openDropdown === type && (
                    <div className="px-2 py-2">
                      {type === "Performance" && (
                        <div className="space-y-2">
                          <SummaryRow label="Amount Spent" value={ad.spend != null ? formatCurrency(ad.spend) : "-"} />
                          <SummaryRow label="Impressions" value={ad.impressions != null ? formatNumber(ad.impressions) : "-"} />
                          <SummaryRow label="Clicks" value={ad.clicks != null ? formatNumber(ad.clicks) : "-"} />
                          <SummaryRow label="CTR" value={ad.impressions && ad.clicks ? ((ad.clicks / ad.impressions) * 100).toFixed(2) + "%" : "-"} />
                          <SummaryRow label="CPC" value={ad.clicks && ad.spend ? formatCurrency(ad.spend / ad.clicks) : "-"} />
                          <SummaryRow label="Reach" value={ad.reach != null ? formatNumber(ad.reach) : "-"} />
                          <SummaryRow label="ROAS" value={ad.spend && ad.revenue ? (ad.revenue / ad.spend).toFixed(2) : "-"} />
                          <SummaryRow label="Purchases" value={ad.purchases != null ? formatNumber(ad.purchases) : "-"} />
                          <SummaryRow label="Cost Per Purchase" value={ad.purchases && ad.spend ? formatCurrency(ad.spend / ad.purchases) : "-"} />
                          <SummaryRow label="Add to Cart" value={ad.add_to_cart != null ? formatNumber(ad.add_to_cart) : "-"} />
                          <SummaryRow label="App Installs" value={ad.app_installs != null ? formatNumber(ad.app_installs) : "-"} />
                        </div>
                      )}
                      {type === "Custom Conversions" && ad.conversions && typeof ad.conversions === 'object' && (
                        <div className="space-y-2">
                          {Object.entries(ad.conversions).map(([key, value]) => (
                            <SummaryRow key={key} label={key} value={typeof value === 'number' ? formatNumber(value) : value} />
                          ))}
                        </div>
                      )}
                      {type === "Copy" && (
                        <div className="space-y-2">
                          <SummaryRow label="Headline" value={ad.headline || "-"} />
                          <SummaryRow label="Title" value={ad.title || ad.name || ad.ad_name || "-"} />
                          <SummaryRow label="Description" value={ad.description || "-"} />
                          <SummaryRow label="Call to Action" value={ad.call_to_action || "-"} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-1 px-2">
      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</span>
      <span className="text-xs text-gray-900 dark:text-white font-mono text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}
