"use client";

import { useState } from "react";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MetaCampaignData {
  campaign: {
    id: string;
    name: string;
    status: string;
    objective: string;
    daily_budget: number;
    lifetime_budget: number;
  };
  insights: {
    impressions: number;
    clicks: number;
    reach: number;
    spend: number;
    conversions: number;
  };
  adSets: {
    adSet: {
      id: string;
      name: string;
      status: string;
      daily_budget: number;
      lifetime_budget: number;
      bid_amount: number;
      billing_event: string;
      optimization_goal: string;
      ad_set_id: string;
      impressions?: number;
      clicks?: number;
      spend?: number;
    };
    insights: {
      impressions: number;
      clicks: number;
      reach: number;
      spend: number;
      conversions: number;
    };
    ads: {
      ad: {
        id: string;
        name: string;
        status: string;
        creative: Record<string, unknown>;
        ad_id: string;
        impressions?: number;
        clicks?: number;
        spend?: number;
        last_updated: string;
      };
      insights: {
        impressions: number;
        clicks: number;
        reach: number;
        spend: number;
        conversions: number;
      };
    }[];
  }[];
}

interface AccountResponse {
  result: {
    name: string;
    account_status: number;
    amount_spent: number;
    balance: number;
    currency: string;
    spend_cap: number;
    insights?: {
      impressions: number;
      clicks: number;
      reach: number;
      conversions: number;
      cpc: number;
      cpm: number;
      website_purchase_roas: number;
    };
  };
}

interface MetaCampaignResponse {
  campaigns: MetaCampaignData[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export default function MetaMarketingPage() {
  const [accountId, setAccountId] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const pageSize = 10;

  const {
    data: accountData,
    isLoading: accountLoading,
    error: accountError,
  } = useQuery<AccountResponse>({
    queryKey: ["metaAccount", accountId],
    queryFn: async () => {
      if (!accountId || !isSubmitted) {
        throw new Error("Account ID is required");
      }
      console.log("Fetching account data...");
      const res = await fetch(
        `/api/meta-marketing?action=getAccountInfo&accountId=${accountId}`
      );
      if (!res.ok) {
        const error = await res.json();
        console.error("Account fetch error:", error);
        if (error.retryAfter) {
          await new Promise((resolve) =>
            setTimeout(resolve, error.retryAfter * 1000)
          );
          throw new Error("Retrying...");
        }
        throw new Error(error.error || "Failed to fetch account data");
      }
      const data = await res.json();
      console.log("Account data received:", data);
      setLastUpdated(new Date());
      return data;
    },
    enabled: !!accountId && isSubmitted,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const {
    data: campaignData,
    isLoading: campaignLoading,
    error: campaignError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<MetaCampaignResponse>({
    queryKey: ["metaCampaigns", accountId],
    queryFn: async ({ pageParam = 1 }) => {
      if (!accountId || !isSubmitted) {
        throw new Error("Account ID is required");
      }
      console.log(`Fetching campaign data page ${pageParam}...`);
      const res = await fetch(
        `/api/meta-marketing?action=getCampaigns&accountId=${accountId}&page=${pageParam}&pageSize=${pageSize}`
      );
      if (!res.ok) {
        const error = await res.json();
        console.error("Campaign fetch error:", error);
        if (error.retryAfter) {
          await new Promise((resolve) =>
            setTimeout(resolve, error.retryAfter * 1000)
          );
          throw new Error("Retrying...");
        }
        throw new Error(error.error || "Failed to fetch campaign data");
      }
      const data = await res.json();
      console.log(`Campaign data received for page ${pageParam}:`, data);
      return data.result;
    },
    initialPageParam: 1,
    enabled: !!accountId && isSubmitted,
    getNextPageParam: (lastPage) => {
      if (!lastPage.campaigns?.length) {
        console.log("No more campaigns available");
        return undefined;
      }
      const nextPage =
        lastPage.pagination.page <
        Math.ceil(lastPage.pagination.total / lastPage.pagination.pageSize)
          ? lastPage.pagination.page + 1
          : undefined;
      console.log(`Next page parameter: ${nextPage}`);
      return nextPage;
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: accountData?.result?.currency || "USD",
    }).format(value);
  };
  console.log({ campaignData });

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Meta Marketing Dashboard</h1>
      <p className="text-sm text-gray-500 mb-4">
        Showing data for the last 12 months
        {lastUpdated && ` (Last updated: ${lastUpdated.toLocaleString()})`}
      </p>

      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex gap-4">
          <Input
            type="text"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            placeholder="Enter Meta Account ID (e.g., act_123456789)"
            className="max-w-md"
          />
          <Button type="submit" disabled={accountLoading || campaignLoading}>
            {accountLoading || campaignLoading ? "Loading..." : "Fetch Data"}
          </Button>
        </div>
      </form>

      {(accountLoading || campaignLoading) && (
        <Alert className="mb-4">
          <AlertDescription>
            Loading data... This might take a while for large accounts.
          </AlertDescription>
        </Alert>
      )}

      {(accountError || campaignError) && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            {accountError?.message ||
              campaignError?.message ||
              "An error occurred. Please try again later."}
            {(accountError?.message?.includes("Rate limit") ||
              campaignError?.message?.includes("Rate limit")) && (
              <p className="mt-2">
                The Meta API rate limit has been reached. Please wait a few
                minutes before trying again.
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {accountData?.result && (
        <div className="grid gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Account Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <h3 className="font-semibold">Account Name</h3>
                  <p>{accountData.result.name}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Amount Spent</h3>
                  <p>{formatCurrency(accountData.result.amount_spent)}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Balance</h3>
                  <p>{formatCurrency(accountData.result.balance)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {accountData.result.insights && (
            <Card>
              <CardHeader>
                <CardTitle>Account Insights (Last 30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <h3 className="font-semibold">Impressions</h3>
                    <p>
                      {accountData.result.insights.impressions?.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Clicks</h3>
                    <p>
                      {accountData.result.insights.clicks?.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Reach</h3>
                    <p>{accountData.result.insights.reach?.toLocaleString()}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Conversions</h3>
                    <p>
                      {accountData.result.insights.conversions?.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold">CPC</h3>
                    <p>{formatCurrency(accountData.result.insights.cpc)}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold">CPM</h3>
                    <p>{formatCurrency(accountData.result.insights.cpm)}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold">ROAS</h3>
                    <p>
                      {accountData.result.insights.website_purchase_roas?.toFixed(
                        2
                      )}
                      x
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {campaignData?.pages.map((page, i) => (
        <div key={i} className="mb-8">
          {page.campaigns.map((item: MetaCampaignData) => (
            <Card key={item.campaign.id}>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  {/* Campaign Info */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">
                      Campaign Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <h4 className="font-semibold">Campaign Name</h4>
                        <p>{item.campaign.name}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold">Status</h4>
                        <p className="capitalize">
                          {item.campaign.status.toLowerCase()}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold">Objective</h4>
                        <p className="capitalize">
                          {item.campaign.objective.toLowerCase()}
                        </p>
                      </div>
                      {item.insights && (
                        <>
                          <div>
                            <h4 className="font-semibold">Impressions</h4>
                            <p>{item.insights.impressions?.toLocaleString()}</p>
                          </div>
                          <div>
                            <h4 className="font-semibold">Clicks</h4>
                            <p>{item.insights.clicks?.toLocaleString()}</p>
                          </div>
                          <div>
                            <h4 className="font-semibold">Spend</h4>
                            <p>{formatCurrency(item.insights.spend)}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Ad Sets */}
                  {item.adSets.map((adSetData) => (
                    <div
                      key={adSetData.adSet.ad_set_id}
                      className="border-t pt-6"
                    >
                      <h3 className="text-lg font-semibold mb-4">
                        Ad Set: {adSetData.adSet.name}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        <div>
                          <h4 className="font-semibold">Status</h4>
                          <p className="capitalize">
                            {adSetData.adSet.status.toLowerCase()}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold">Daily Budget</h4>
                          <p>{formatCurrency(adSetData.adSet.daily_budget)}</p>
                        </div>
                        <div>
                          <h4 className="font-semibold">Lifetime Budget</h4>
                          <p>
                            {formatCurrency(adSetData.adSet.lifetime_budget)}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold">Impressions</h4>
                          <p>{adSetData.adSet.impressions != null ? adSetData.adSet.impressions.toLocaleString() : '-'}</p>
                        </div>
                        <div>
                          <h4 className="font-semibold">Clicks</h4>
                          <p>{adSetData.adSet.clicks?.toLocaleString()}</p>
                        </div>
                        <div>
                          <h4 className="font-semibold">Spend</h4>
                          <p>{formatCurrency(adSetData.adSet.spend ?? 0)}</p>
                        </div>
                      </div>

                      {/* Ads */}
                      <div className="space-y-4 mt-4">
                        <h4 className="font-semibold text-lg">Ads</h4>
                        {adSetData.ads.map((ad) => (
                          <div
                            key={ad.ad.ad_id}
                            className="bg-gray-50 p-4 rounded-lg"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              <div>
                                <h5 className="font-semibold">Ad Name</h5>
                                <p>{ad.ad.name ?? '-'}</p>
                              </div>
                              <div>
                                <h5 className="font-semibold">Status</h5>
                                <p className="capitalize">
                                  {ad.ad.status ? ad.ad.status.toLowerCase() : '-'}
                                </p>
                              </div>
                              <div>
                                <h5 className="font-semibold">Impressions</h5>
                                <p>{ad.ad.impressions != null ? ad.ad.impressions.toLocaleString() : '-'}</p>
                              </div>
                              <div>
                                <h5 className="font-semibold">Clicks</h5>
                                <p>{ad.ad.clicks != null ? ad.ad.clicks.toLocaleString() : '-'}</p>
                              </div>
                              <div>
                                <h5 className="font-semibold">Spend</h5>
                                <p>{formatCurrency(ad.ad.spend ?? 0)}</p>
                              </div>
                              <div>
                                <h5 className="font-semibold">Last Updated</h5>
                                <p>
                                  {ad.ad.last_updated ? new Date(ad.ad.last_updated).toLocaleString() : '-'}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ))}

      {hasNextPage && (
        <div className="mt-8 text-center">
          <Button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            variant="outline"
          >
            {isFetchingNextPage ? "Loading more..." : "Load More Campaigns"}
          </Button>
        </div>
      )}
    </div>
  );
}
