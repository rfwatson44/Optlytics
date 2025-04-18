// Column mapping between Supabase and AdsTable UI
// Format helpers
export function formatCurrency(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '-';
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}
export function formatNumber(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '-';
  return num.toLocaleString('en-US');
}

export const ADS_COLUMN_MAP = [
  {
    label: "Ad Name",
    value: "ad_name",
    getValue: (row: any) => row.name || "-",
  },
  {
    label: "Amount Spent",
    value: "amount_spent",
    getValue: (row: any) => row.spend != null ? formatCurrency(row.spend) : "-",
  },
  {
    label: "Impressions",
    value: "impressions",
    getValue: (row: any) => row.impressions != null ? formatNumber(row.impressions) : "-",
  },
  {
    label: "Clicks",
    value: "clicks",
    getValue: (row: any) => row.clicks != null ? formatNumber(row.clicks) : "-",
  },
  {
    label: "CTR",
    value: "ctr",
    getValue: (row: any) =>
      row.impressions && row.clicks
        ? ((row.clicks / row.impressions) * 100).toFixed(2) + "%"
        : "-",
  },
  {
    label: "CPC",
    value: "cpc",
    getValue: (row: any) =>
      row.clicks && row.spend ? formatCurrency(row.spend / row.clicks) : "-",
  },
  {
    label: "Reach",
    value: "reach",
    getValue: (row: any) => row.reach != null ? formatNumber(row.reach) : "-",
  },
  {
    label: "ROAS",
    value: "roas",
    getValue: (row: any) =>
      row.spend && row.revenue ? (row.revenue / row.spend).toFixed(2) : "-",
  },
  {
    label: "Purchases",
    value: "purchases",
    getValue: (row: any) => row.purchases != null ? formatNumber(row.purchases) : "-",
  },
  {
    label: "Cost Per Purchase",
    value: "cost_per_purchase",
    getValue: (row: any) =>
      row.purchases && row.spend ? formatCurrency(row.spend / row.purchases) : "-",
  },
  {
    label: "Add to Cart",
    value: "add_to_cart",
    getValue: (row: any) => row.add_to_cart != null ? formatNumber(row.add_to_cart) : "-",
  },
  {
    label: "App Installs",
    value: "app_installs",
    getValue: (row: any) => row.app_installs != null ? formatNumber(row.app_installs) : "-",
  },
  {
    label: "Cost Per App Install",
    value: "cost_per_app_install",
    getValue: (row: any) =>
      row.app_installs && row.spend ? formatCurrency(row.spend / row.app_installs) : "-",
  },
  {
    label: "Leads",
    value: "leads",
    getValue: (row: any) => row.leads != null ? formatNumber(row.leads) : "-",
  },
  {
    label: "Cost Per Lead",
    value: "cost_per_lead",
    getValue: (row: any) =>
      row.leads && row.spend ? formatCurrency(row.spend / row.leads) : "-",
  },
];
