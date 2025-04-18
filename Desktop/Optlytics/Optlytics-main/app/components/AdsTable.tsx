import React from "react";

// Dummy data for demonstration
const ADS = [
  {
    name: "iOS - WZ full footage w/ C...",
    img: "/placeholder1.png",
    ads: 4,
    amountSpent: "$52,184.3",
    impressions: "6,160,476",
    appInstalls: "18,245",
    costPerAppInstall: "$2.86",
    ctr: "0.91%",
    cpc: "None",
    outboundClicks: 0,
  },
  // ... more rows as needed
];

export default function AdsTable() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-100 dark:border-gray-800 overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Ad Name</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Amount Spent</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Impressions</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">App Installs</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Cost Per App Install</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">CTR</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">CPC</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Outbound Clicks</th>
          </tr>
        </thead>
        <tbody>
          {ADS.map((ad, i) => (
            <tr key={i} className="border-t border-gray-100 dark:border-gray-800 hover:bg-green-50 dark:hover:bg-green-950">
              <td className="px-4 py-3 flex items-center gap-2">
                <img src={ad.img || 'https://via.placeholder.com/32'} alt="ad" className="w-8 h-8 rounded object-cover" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">{ad.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{ad.ads} ads</div>
                </div>
              </td>
              <td className="px-4 py-3">{ad.amountSpent}</td>
              <td className="px-4 py-3">{ad.impressions}</td>
              <td className="px-4 py-3">{ad.appInstalls}</td>
              <td className="px-4 py-3">{ad.costPerAppInstall}</td>
              <td className="px-4 py-3">{ad.ctr}</td>
              <td className="px-4 py-3">{ad.cpc}</td>
              <td className="px-4 py-3">{ad.outboundClicks}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
