"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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

export default function MetaMarketingPage() {
  const [accountId, setAccountId] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    data: accountData,
    isLoading: accountLoading,
    error: accountError,
  } = useQuery({
    queryKey: ["metaAccount", accountId],
    queryFn: async () => {
      if (!accountId || !isSubmitted) return null;
      const res = await fetch(
        `/api/meta-marketing?action=getAccountInfo&accountId=${accountId}`
      );
      if (!res.ok) throw new Error("Failed to fetch account data");
      return res.json();
    },
    enabled: !!accountId && isSubmitted,
  });

  const {
    data: campaignData,
    isLoading: campaignLoading,
    error: campaignError,
  } = useQuery({
    queryKey: ["metaCampaigns", accountId],
    queryFn: async () => {
      if (!accountId || !isSubmitted) return null;
      const res = await fetch(
        `/api/meta-marketing?action=getCampaigns&accountId=${accountId}`
      );
      if (!res.ok) throw new Error("Failed to fetch campaign data");
      return res.json();
    },
    enabled: !!accountId && isSubmitted,
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

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Meta Marketing Dashboard</h1>

      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex gap-4">
          <Input
            type="text"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            placeholder="Enter Meta Account ID (e.g., act_123456789)"
            className="max-w-md"
          />
          <Button type="submit">Fetch Data</Button>
        </div>
      </form>

      {(accountLoading || campaignLoading) && (
        <Alert className="mb-4">
          <AlertDescription>Loading data...</AlertDescription>
        </Alert>
      )}

      {(accountError || campaignError) && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            {accountError?.message ||
              campaignError?.message ||
              "An error occurred"}
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

      {campaignData?.result && (
        <Card>
          <CardHeader>
            <CardTitle>Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {campaignData.result.map((item: MetaCampaignData) => (
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
                                <p>
                                  {item.insights.impressions?.toLocaleString()}
                                </p>
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
                        <div key={adSetData.adSet.id} className="border-t pt-6">
                          <h3 className="text-lg font-semibold mb-4">
                            Ad Set: {adSetData.adSet.name}
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                            <div>
                              <h4 className="font-semibold">Status</h4>
                              <p className="capitalize">
                                {adSetData.adSet.status.toLowerCase()}
                              </p>
                            </div>
                            <div>
                              <h4 className="font-semibold">Daily Budget</h4>
                              <p>
                                {formatCurrency(adSetData.adSet.daily_budget)}
                              </p>
                            </div>
                            <div>
                              <h4 className="font-semibold">Bid Amount</h4>
                              <p>
                                {formatCurrency(adSetData.adSet.bid_amount)}
                              </p>
                            </div>
                            {adSetData.insights && (
                              <>
                                <div>
                                  <h4 className="font-semibold">Impressions</h4>
                                  <p>
                                    {adSetData.insights.impressions?.toLocaleString()}
                                  </p>
                                </div>
                                <div>
                                  <h4 className="font-semibold">Clicks</h4>
                                  <p>
                                    {adSetData.insights.clicks?.toLocaleString()}
                                  </p>
                                </div>
                                <div>
                                  <h4 className="font-semibold">Spend</h4>
                                  <p>
                                    {formatCurrency(adSetData.insights.spend)}
                                  </p>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Ads */}
                          <div className="pl-4 border-l">
                            <h4 className="text-md font-semibold mb-4">Ads</h4>
                            <div className="grid gap-4">
                              {adSetData.ads.map((adData) => (
                                <div
                                  key={adData.ad.id}
                                  className="bg-gray-50 p-4 rounded-lg"
                                >
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div>
                                      <h5 className="font-semibold">Ad Name</h5>
                                      <p>{adData.ad.name}</p>
                                    </div>
                                    <div>
                                      <h5 className="font-semibold">Status</h5>
                                      <p className="capitalize">
                                        {adData.ad.status.toLowerCase()}
                                      </p>
                                    </div>
                                    {adData.insights && (
                                      <>
                                        <div>
                                          <h5 className="font-semibold">
                                            Impressions
                                          </h5>
                                          <p>
                                            {adData.insights.impressions?.toLocaleString()}
                                          </p>
                                        </div>
                                        <div>
                                          <h5 className="font-semibold">
                                            Clicks
                                          </h5>
                                          <p>
                                            {adData.insights.clicks?.toLocaleString()}
                                          </p>
                                        </div>
                                        <div>
                                          <h5 className="font-semibold">
                                            Spend
                                          </h5>
                                          <p>
                                            {formatCurrency(
                                              adData.insights.spend
                                            )}
                                          </p>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
