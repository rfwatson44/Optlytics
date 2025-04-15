import { NextResponse } from "next/server";
import {
  FacebookAdsApi,
  AdAccount,
  Campaign,
  AdSet,
  Ad,
} from "facebook-nodejs-business-sdk";
import { createClient } from "@/utils/supabase/server";

interface InsightData {
  spend: string;
  impressions: string;
  clicks: string;
  reach?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  website_purchase_roas?: string;
  conversions?: string;
  actions?: Record<string, unknown>[] | Record<string, unknown>;
}

// Initialize Meta API configuration
const META_CONFIG = {
  accessToken: process.env.META_ACCESS_TOKEN!,
};

// Rate limiting configuration
const RATE_LIMIT_DELAY = 2000; // 2 seconds between calls

// Helper function to delay execution
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Initialize the API
function initializeApi(accessToken: string) {
  const api = FacebookAdsApi.init(accessToken);
  api.setDebug(true);
  return api;
}

// Helper function to get date range for last 12 months
function getLast12MonthsDateRange() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 12);
  return {
    since: startDate.toISOString().split("T")[0],
    until: endDate.toISOString().split("T")[0],
  };
}

// Helper function to get insights with rate limiting and error handling
async function getInsights(
  entity: Campaign | AdSet | Ad | AdAccount,
  metrics: string[]
): Promise<InsightData | null> {
  try {
    await delay(RATE_LIMIT_DELAY);
    console.log(`Fetching insights for entity ID: ${entity.id}`);
    const dateRange = getLast12MonthsDateRange();
    console.log(`Date range: ${dateRange.since} to ${dateRange.until}`);

    const insights = await entity.getInsights(metrics, {
      time_range: dateRange,
    });

    if (!insights || !Array.isArray(insights) || insights.length === 0) {
      return null;
    }

    return insights[0] as InsightData;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "response" in error &&
      error.response &&
      typeof error.response === "object" &&
      "error" in error.response &&
      error.response.error &&
      typeof error.response.error === "object" &&
      "code" in error.response.error &&
      error.response.error.code === 17
    ) {
      console.log("Rate limit hit, waiting 5 seconds...");
      await delay(5000);
      return getInsights(entity, metrics);
    }
    console.error("Error fetching insights:", error);
    return null;
  }
}

// Helper function to format conversions data
function formatConversions(
  data: Record<string, unknown> | Array<unknown> | null | undefined
) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === "object") return [data];
  return [];
}

// GET handler for account info and campaigns
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const accountId = searchParams.get("accountId");

    console.log(`Processing ${action} request for account ${accountId}`);

    if (!accountId) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      );
    }

    await initializeApi(META_CONFIG.accessToken);
    const account = new AdAccount(accountId);
    const supabase = await createClient();

    let result;

    switch (action) {
      case "getAccountInfo":
        console.log("Fetching account info...");
        await delay(RATE_LIMIT_DELAY);
        const accountInfo = await account.read([
          "name",
          "account_status",
          "amount_spent",
          "balance",
          "currency",
          "spend_cap",
        ]);

        const insights = await getInsights(account, [
          "impressions",
          "clicks",
          "reach",
          "spend",
          "conversions",
          "cpc",
          "cpm",
          "website_purchase_roas",
          "actions",
        ]);

        const accountData = {
          account_id: accountId,
          name: accountInfo.name,
          account_status: accountInfo.account_status,
          amount_spent: parseFloat(accountInfo.amount_spent) || 0,
          balance: parseFloat(accountInfo.balance) || 0,
          currency: accountInfo.currency,
          spend_cap: parseFloat(accountInfo.spend_cap) || null,
          insights_start_date: new Date(getLast12MonthsDateRange().since),
          insights_end_date: new Date(getLast12MonthsDateRange().until),
          total_impressions: parseInt(insights?.impressions ?? "0") || 0,
          total_clicks: parseInt(insights?.clicks ?? "0") || 0,
          total_reach: parseInt(insights?.reach ?? "0") || 0,
          total_conversions: formatConversions(insights?.actions),
          average_cpc: parseFloat(insights?.cpc ?? "0") || 0,
          average_cpm: parseFloat(insights?.cpm ?? "0") || 0,
          roas: parseFloat(insights?.website_purchase_roas ?? "0") || 0,
          last_updated: new Date(),
        };

        const { error: accountError } = await supabase
          .from("meta_account_insights")
          .upsert([accountData], { onConflict: "account_id" });

        if (accountError) {
          console.error("Error storing account data:", accountError);
        } else {
        }

        result = { ...accountInfo, insights };
        break;

      case "getCampaigns":
        console.log("Fetching campaigns...");
        try {
          // First, check if we have data for this account in the database
          const { data: dbCampaigns, error: dbCampaignsError } = await supabase
            .from("meta_campaigns")
            .select("*, last_updated")
            .eq("account_id", accountId);

          if (dbCampaignsError) {
            console.error(
              "Error fetching campaigns from database:",
              dbCampaignsError
            );
            throw dbCampaignsError;
          }

          // Check if we have recent data (less than 24h old)
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const hasRecentData = dbCampaigns.some(
            (campaign) => new Date(campaign.last_updated) > oneDayAgo
          );

          // If we have recent data, get all related data from database
          if (hasRecentData) {
            console.log(
              "Found recent data in database, fetching related data..."
            );

            // Get ad sets for these campaigns
            const { data: dbAdSets, error: dbAdSetsError } = await supabase
              .from("meta_ad_sets")
              .select("*")
              .in(
                "campaign_id",
                dbCampaigns.map((c) => c.campaign_id)
              );

            if (dbAdSetsError) {
              console.error(
                "Error fetching ad sets from database:",
                dbAdSetsError
              );
              throw dbAdSetsError;
            }

            // Get ads for these ad sets
            const { data: dbAds, error: dbAdsError } = await supabase
              .from("meta_ads")
              .select("*")
              .in(
                "ad_set_id",
                dbAdSets.map((as) => as.ad_set_id)
              );

            if (dbAdsError) {
              console.error("Error fetching ads from database:", dbAdsError);
              throw dbAdsError;
            }

            // Structure the data
            const campaigns = dbCampaigns.map((campaign) => {
              const campaignAdSets = dbAdSets
                .filter((adSet) => adSet.campaign_id === campaign.campaign_id)
                .map((adSet) => ({
                  adSet,
                  ads: dbAds.filter((ad) => ad.ad_set_id === adSet.ad_set_id),
                }));

              return {
                campaign,
                adSets: campaignAdSets,
              };
            });

            return NextResponse.json({
              result: {
                campaigns,
                pagination: {
                  page: 1,
                  pageSize: 100,
                  total: campaigns.length,
                  fromDatabase: true,
                },
              },
            });
          }

          // If no recent data, fetch from Meta API
          console.log("No recent data found, fetching from Meta API...");
          let allCampaigns;
          try {
            allCampaigns = await account.getCampaigns(
              [
                "name",
                "status",
                "objective",
                "daily_budget",
                "lifetime_budget",
                "start_time",
                "end_time",
              ],
              {
                limit: 100,
                time_range: getLast12MonthsDateRange(),
              }
            );
          } catch (error: any) {
            if (error?.response?.error?.code === 17) {
              // If rate limited but we have old data, return it
              if (dbCampaigns.length > 0) {
                const campaigns = dbCampaigns.map((campaign) => ({
                  campaign,
                  adSets: [], // We'll fetch ad sets separately
                }));

                return NextResponse.json({
                  warning:
                    "Rate limit reached. Showing existing data from database.",
                  retryAfter: 300,
                  result: {
                    campaigns,
                    pagination: {
                      page: 1,
                      pageSize: 100,
                      total: campaigns.length,
                      fromDatabase: true,
                      outdated: true,
                    },
                  },
                });
              }
              throw error;
            }
            throw error;
          }

          // Process each campaign
          const processedCampaigns = [];
          let rateLimitHit = false;

          for (const campaign of allCampaigns) {
            try {
              // Get campaign insights
              const insights = await getInsights(campaign, [
                "impressions",
                "clicks",
                "reach",
                "spend",
                "conversions",
                "actions",
              ]);

              // Store campaign data
              const campaignRecord = {
                campaign_id: campaign.id,
                account_id: accountId,
                name: campaign.name,
                status: campaign.status,
                objective: campaign.objective,
                daily_budget: parseFloat(campaign.daily_budget) || 0,
                lifetime_budget: parseFloat(campaign.lifetime_budget) || 0,
                start_time: campaign.start_time
                  ? new Date(campaign.start_time)
                  : null,
                end_time: campaign.end_time
                  ? new Date(campaign.end_time)
                  : null,
                impressions: parseInt(insights?.[0]?.impressions || "0"),
                clicks: parseInt(insights?.[0]?.clicks || "0"),
                reach: parseInt(insights?.[0]?.reach || "0"),
                spend: parseFloat(insights?.[0]?.spend || "0"),
                conversions: formatConversions(insights?.[0]?.actions),
                last_updated: new Date(),
              };

              const { error: campaignError } = await supabase
                .from("meta_campaigns")
                .upsert([campaignRecord], { onConflict: "campaign_id" });

              if (campaignError) {
                console.error(
                  `Error storing campaign ${campaign.id}:`,
                  campaignError
                );
                continue;
              }

              // Get and store ad sets
              const campaignAdSets = [];
              try {
                const adSets = await campaign.getAdSets([
                  "name",
                  "status",
                  "daily_budget",
                  "lifetime_budget",
                  "bid_amount",
                  "billing_event",
                  "optimization_goal",
                  "targeting",
                  "start_time",
                  "end_time",
                ]);

                for (const adSet of adSets) {
                  const adSetInsights = await getInsights(adSet, [
                    "impressions",
                    "clicks",
                    "reach",
                    "spend",
                    "conversions",
                    "actions",
                  ]);

                  const adSetRecord = {
                    ad_set_id: adSet.id,
                    campaign_id: campaign.id,
                    name: adSet.name,
                    status: adSet.status,
                    daily_budget: parseFloat(adSet.daily_budget) || 0,
                    lifetime_budget: parseFloat(adSet.lifetime_budget) || 0,
                    bid_amount: parseFloat(adSet.bid_amount) || 0,
                    billing_event: adSet.billing_event,
                    optimization_goal: adSet.optimization_goal,
                    targeting: adSet.targeting,
                    start_time: adSet.start_time
                      ? new Date(adSet.start_time)
                      : null,
                    end_time: adSet.end_time ? new Date(adSet.end_time) : null,
                    impressions: parseInt(
                      adSetInsights?.[0]?.impressions || "0"
                    ),
                    clicks: parseInt(adSetInsights?.[0]?.clicks || "0"),
                    reach: parseInt(adSetInsights?.[0]?.reach || "0"),
                    spend: parseFloat(adSetInsights?.[0]?.spend || "0"),
                    conversions: formatConversions(adSetInsights?.[0]?.actions),
                    last_updated: new Date(),
                  };

                  const { error: adSetError } = await supabase
                    .from("meta_ad_sets")
                    .upsert([adSetRecord], { onConflict: "ad_set_id" });

                  if (adSetError) {
                    console.error(
                      `Error storing ad set ${adSet.id}:`,
                      adSetError
                    );
                    continue;
                  }

                  const adSetAds = [];
                  try {
                    const ads = await adSet.getAds([
                      "name",
                      "status",
                      "creative",
                      "tracking_specs",
                      "conversion_specs",
                    ]);

                    for (const ad of ads) {
                      const adInsights = await getInsights(ad, [
                        "impressions",
                        "clicks",
                        "reach",
                        "spend",
                        "conversions",
                        "actions",
                      ]);

                      const adRecord = {
                        ad_id: ad.id,
                        ad_set_id: adSet.id,
                        name: ad.name,
                        status: ad.status,
                        creative: ad.creative,
                        tracking_specs: ad.tracking_specs,
                        conversion_specs: ad.conversion_specs,
                        impressions: parseInt(
                          adInsights?.[0]?.impressions || "0"
                        ),
                        clicks: parseInt(adInsights?.[0]?.clicks || "0"),
                        reach: parseInt(adInsights?.[0]?.reach || "0"),
                        spend: parseFloat(adInsights?.[0]?.spend || "0"),
                        conversions: formatConversions(
                          adInsights?.[0]?.actions
                        ),
                        last_updated: new Date(),
                      };

                      const { error: adError } = await supabase
                        .from("meta_ads")
                        .upsert([adRecord], { onConflict: "ad_id" });

                      if (adError) {
                        console.error(`Error storing ad ${ad.id}:`, adError);
                        continue;
                      }

                      adSetAds.push(adRecord);
                    }
                  } catch (error: any) {
                    if (error?.response?.error?.code === 17) {
                      rateLimitHit = true;
                      break;
                    }
                    console.error(
                      `Error processing ads for ad set ${adSet.id}:`,
                      error
                    );
                  }

                  campaignAdSets.push({
                    adSet: adSetRecord,
                    ads: adSetAds,
                  });

                  if (rateLimitHit) break;
                }
              } catch (error: any) {
                if (error?.response?.error?.code === 17) {
                  rateLimitHit = true;
                  break;
                }
                console.error(
                  `Error processing ad sets for campaign ${campaign.id}:`,
                  error
                );
              }

              processedCampaigns.push({
                campaign: campaignRecord,
                adSets: campaignAdSets,
              });

              if (rateLimitHit) break;
            } catch (error: any) {
              if (error?.response?.error?.code === 17) {
                rateLimitHit = true;
                break;
              }
              console.error(`Error processing campaign ${campaign.id}:`, error);
              continue;
            }
          }

          // Return appropriate response
          if (
            rateLimitHit &&
            processedCampaigns.length === 0 &&
            dbCampaigns.length > 0
          ) {
            // If rate limited and no new data processed, return database data
            const campaigns = dbCampaigns.map((campaign) => ({
              campaign,
              adSets: [], // We'll fetch ad sets separately
            }));

            return NextResponse.json({
              warning:
                "Rate limit reached. Showing existing data from database.",
              retryAfter: 300,
              result: {
                campaigns,
                pagination: {
                  page: 1,
                  pageSize: 100,
                  total: campaigns.length,
                  fromDatabase: true,
                  outdated: true,
                },
              },
            });
          }

          result = {
            campaigns: processedCampaigns,
            pagination: {
              page: 1,
              pageSize: 100,
              total: processedCampaigns.length,
              complete: !rateLimitHit,
            },
          };

          if (rateLimitHit) {
            result.warning = "Rate limit reached. Partial data retrieved.";
            result.retryAfter = 300;
          }
        } catch (error) {
          console.error("Error fetching campaigns:", error);
          throw error;
        }
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ result });
  } catch (error: any) {
    console.error("Error:", error);
    if (error?.response?.error?.code === 17) {
      return NextResponse.json(
        {
          error: "Rate limit reached. Please try again in a few minutes.",
          retryAfter: 300,
        },
        { status: 429 }
      );
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

// POST handler for creating campaigns and ad sets
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const data = await request.json();

    // Initialize Meta API
    try {
      await initializeApi(META_CONFIG.accessToken);
    } catch (error) {
      console.error("Failed to initialize Meta API:", error);
      return NextResponse.json(
        { error: "Failed to initialize Meta API" },
        { status: 500 }
      );
    }

    const account = new AdAccount(data.accountId);
    const supabase = await createClient();

    let result;
    let supabaseResult;

    switch (action) {
      case "createCampaign":
        try {
          result = await account.createCampaign(["id"], {
            name: data.name,
            objective: data.objective,
            status: data.status,
            special_ad_categories: [],
          });

          // Store in Supabase
          const campaignData = {
            campaign_id: result.id,
            account_id: data.accountId,
            name: data.name,
            status: data.status,
            objective: data.objective,
          };

          const { data: insertedData, error: supabaseError } = await supabase
            .from("meta_campaigns")
            .insert([campaignData]);

          if (supabaseError) {
            console.error("Supabase error:", supabaseError);
            throw new Error("Failed to store campaign data");
          }

          supabaseResult = insertedData;
        } catch (error) {
          console.error("Error creating campaign:", error);
          throw error;
        }
        break;

      case "createAdSet":
        try {
          result = await account.createAdSet(["id"], {
            name: data.name,
            campaign_id: data.campaignId,
            daily_budget: data.dailyBudget,
            start_time: data.startTime,
            end_time: data.endTime,
            bid_amount: data.bidAmount,
            billing_event: data.billingEvent,
            optimization_goal: data.optimizationGoal,
            targeting: data.targeting,
            status: data.status,
          });

          // Store in Supabase
          const adSetData = {
            ad_set_id: result.id,
            campaign_id: data.campaignId,
            name: data.name,
            status: data.status,
            daily_budget: data.dailyBudget,
            bid_amount: data.bidAmount,
            billing_event: data.billingEvent,
            optimization_goal: data.optimizationGoal,
            targeting: data.targeting,
            start_time: data.startTime ? new Date(data.startTime) : undefined,
            end_time: data.endTime ? new Date(data.endTime) : undefined,
          };

          const { data: insertedData, error: supabaseError } = await supabase
            .from("meta_ad_sets")
            .insert([adSetData]);

          if (supabaseError) {
            console.error("Supabase error:", supabaseError);
            throw new Error("Failed to store ad set data");
          }

          supabaseResult = insertedData;
        } catch (error) {
          console.error("Error creating ad set:", error);
          throw error;
        }
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ result, supabaseResult });
  } catch (error) {
    console.error("Error:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "Unknown error occurred" },
      { status: 500 }
    );
  }
}
