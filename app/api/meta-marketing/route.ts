import { NextResponse } from "next/server";
import { FacebookAdsApi, AdAccount } from "facebook-nodejs-business-sdk";
import { createClient } from "@/utils/supabase/server";

// Initialize Meta API configuration
const META_CONFIG = {
  accessToken: process.env.META_ACCESS_TOKEN!,
};

// Initialize the API
function initializeApi(accessToken: string) {
  const api = FacebookAdsApi.init(accessToken);
  api.setDebug(true);
  return api;
}

// Helper function to get insights
async function getInsights(entity: any, metrics: string[]) {
  try {
    const insights = await entity.getInsights(metrics, {
      time_range: {
        since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        until: new Date().toISOString().split("T")[0],
      },
    });
    return insights?.[0] || null;
  } catch (error) {
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
        // Get basic account info
        const accountInfo = await account.read([
          "name",
          "account_status",
          "amount_spent",
          "balance",
          "currency",
          "spend_cap",
        ]);

        // Get account insights
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

        // Prepare data for Supabase
        const accountData = {
          account_id: accountId,
          name: accountInfo.name,
          account_status: accountInfo.account_status,
          amount_spent: parseFloat(accountInfo.amount_spent) || 0,
          balance: parseFloat(accountInfo.balance) || 0,
          currency: accountInfo.currency,
          spend_cap: parseFloat(accountInfo.spend_cap) || null,
          insights_start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          insights_end_date: new Date(),
          total_impressions: parseInt(insights?.impressions) || 0,
          total_clicks: parseInt(insights?.clicks) || 0,
          total_reach: parseInt(insights?.reach) || 0,
          total_conversions: formatConversions(insights?.actions),
          average_cpc: parseFloat(insights?.cpc) || 0,
          average_cpm: parseFloat(insights?.cpm) || 0,
          roas: parseFloat(insights?.website_purchase_roas) || 0,
        };

        // Store in Supabase
        const { error: accountError } = await supabase
          .from("meta_account_insights")
          .upsert([accountData], {
            onConflict: "account_id",
          });

        if (accountError) {
          console.error("Supabase error:", accountError);
        }

        result = { ...accountInfo, insights };
        break;

      case "getCampaigns":
        // Get campaigns with insights
        const campaigns = await account.getCampaigns(
          [
            "name",
            "status",
            "objective",
            "daily_budget",
            "lifetime_budget",
            "start_time",
            "end_time",
          ],
          { limit: 100 }
        );

        // Get campaign insights and ad sets
        const campaignData = await Promise.all(
          campaigns.map(async (campaign) => {
            // Get campaign insights
            const insights = await getInsights(campaign, [
              "impressions",
              "clicks",
              "reach",
              "spend",
              "conversions",
              "actions",
            ]);

            // Get ad sets for this campaign
            const adSets = await campaign.getAdSets(
              [
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
              ],
              { limit: 100 }
            );

            // Get insights for each ad set
            const adSetsWithInsights = await Promise.all(
              adSets.map(async (adSet) => {
                const adSetInsights = await getInsights(adSet, [
                  "impressions",
                  "clicks",
                  "reach",
                  "spend",
                  "conversions",
                  "actions",
                ]);

                // Get ads for this ad set
                const ads = await adSet.getAds(
                  [
                    "name",
                    "status",
                    "creative",
                    "tracking_specs",
                    "conversion_specs",
                  ],
                  { limit: 100 }
                );

                // Get insights for each ad
                const adsWithInsights = await Promise.all(
                  ads.map(async (ad) => {
                    const adInsights = await getInsights(ad, [
                      "impressions",
                      "clicks",
                      "reach",
                      "spend",
                      "conversions",
                      "actions",
                    ]);

                    return {
                      ad,
                      insights: adInsights,
                    };
                  })
                );

                return {
                  adSet,
                  insights: adSetInsights,
                  ads: adsWithInsights,
                };
              })
            );

            return {
              campaign,
              insights,
              adSets: adSetsWithInsights,
            };
          })
        );

        // Store campaign data in Supabase
        const campaignsForSupabase = campaignData.map(
          ({ campaign, insights }) => ({
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
            end_time: campaign.end_time ? new Date(campaign.end_time) : null,
            impressions: parseInt(insights?.impressions) || 0,
            clicks: parseInt(insights?.clicks) || 0,
            reach: parseInt(insights?.reach) || 0,
            spend: parseFloat(insights?.spend) || 0,
            conversions: formatConversions(insights?.actions),
            cost_per_conversion:
              insights?.spend && insights?.conversions
                ? parseFloat(insights.spend) / parseInt(insights.conversions)
                : 0,
          })
        );

        // Store ad sets data in Supabase
        const adSetsForSupabase = campaignData.flatMap(({ campaign, adSets }) =>
          adSets.map(({ adSet, insights }) => ({
            ad_set_id: adSet.id,
            campaign_id: campaign.id,
            name: adSet.name,
            status: adSet.status,
            daily_budget: parseFloat(adSet.daily_budget) || 0,
            lifetime_budget: parseFloat(adSet.lifetime_budget) || 0,
            bid_amount: parseFloat(adSet.bid_amount) || 0,
            billing_event: adSet.billing_event,
            optimization_goal: adSet.optimization_goal,
            targeting: adSet.targeting || {},
            impressions: parseInt(insights?.impressions) || 0,
            clicks: parseInt(insights?.clicks) || 0,
            reach: parseInt(insights?.reach) || 0,
            spend: parseFloat(insights?.spend) || 0,
            conversions: formatConversions(insights?.actions),
            cost_per_conversion:
              insights?.spend && insights?.conversions
                ? parseFloat(insights.spend) / parseInt(insights.conversions)
                : 0,
            start_time: adSet.start_time ? new Date(adSet.start_time) : null,
            end_time: adSet.end_time ? new Date(adSet.end_time) : null,
          }))
        );

        // Store in Supabase
        const { error: campaignError } = await supabase
          .from("meta_campaigns")
          .upsert(campaignsForSupabase, {
            onConflict: "campaign_id",
          });

        if (campaignError) {
          console.error("Supabase error (campaigns):", campaignError);
        }

        const { error: adSetError } = await supabase
          .from("meta_ad_sets")
          .upsert(adSetsForSupabase, {
            onConflict: "ad_set_id",
          });

        if (adSetError) {
          console.error("Supabase error (ad sets):", adSetError);
        }

        result = campaignData;
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error("Error:", error);
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

    await initializeApi(META_CONFIG.accessToken);
    const account = new AdAccount(data.accountId);
    const supabase = await createClient();

    let result;
    let supabaseResult;

    switch (action) {
      case "createCampaign":
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

        supabaseResult = await supabase
          .from("meta_campaigns")
          .insert([campaignData]);
        break;

      case "createAdSet":
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

        supabaseResult = await supabase
          .from("meta_ad_sets")
          .insert([adSetData]);
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ result, supabaseResult });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
