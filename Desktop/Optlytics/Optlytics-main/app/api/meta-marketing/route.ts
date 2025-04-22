import { NextResponse } from "next/server";
import {
  FacebookAdsApi,
  AdAccount,
  Campaign,
  AdSet,
  Ad,
  AdCreative,
} from "facebook-nodejs-business-sdk";
import { createClient } from "@/utils/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";

interface RateLimitInfo {
  usage_percent: number;
  call_count: number;
  total_cputime: number;
  total_time: number;
  estimated_time_to_regain_access: number;
  business_use_case?: string;
  reset_time_duration?: number;
}

// Enhanced rate limiting configuration based on Meta's documentation
const RATE_LIMIT_CONFIG = {
  // API Tier limits
  DEVELOPMENT: {
    MAX_SCORE: 60,
    DECAY_TIME: 300, // 300 seconds
    BLOCK_TIME: 300, // 300 seconds
    ADS_MANAGEMENT_HOURLY: 300, // 300 calls per hour in dev tier
    INSIGHTS_HOURLY: 600, // 600 calls per hour in dev tier
  },
  STANDARD: {
    MAX_SCORE: 9000,
    DECAY_TIME: 300, // 300 seconds
    BLOCK_TIME: 60, // 60 seconds
    ADS_MANAGEMENT_HOURLY: 100000, // 100k calls per hour in standard tier
    INSIGHTS_HOURLY: 190000, // 190k calls per hour in standard tier
  },
  // Operation costs
  POINTS: {
    READ: 1,
    WRITE: 3,
    INSIGHTS: 2, // Insights calls are more expensive
  },
  // Batch and delay settings
  BATCH_SIZE: 50,
  MIN_DELAY: 1000, // 1 second minimum delay
  BURST_DELAY: 2000, // 2 seconds for potential burst
  INSIGHTS_DELAY: 3000, // 3 seconds for insights calls
};

// Initialize Meta API configuration
const META_CONFIG = {
  accessToken: process.env.META_ACCESS_TOKEN!,
};

// Helper function to delay execution
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper function to calculate dynamic delay based on recent API usage
function calculateDynamicDelay(endpoint: string, points: number): number {
  const baseDelay = endpoint.includes("insights")
    ? RATE_LIMIT_CONFIG.INSIGHTS_DELAY
    : RATE_LIMIT_CONFIG.MIN_DELAY;

  // Increase delay as points accumulate
  const pointMultiplier = Math.ceil(points / 10); // Every 10 points increases delay
  return Math.min(baseDelay * pointMultiplier, 5000); // Cap at 5 seconds
}

// Queue system for rate limit handling
const rateLimitQueue = {
  isProcessing: false,
  lastErrorTime: 0,
  consecutiveErrors: 0,
  waitTime: 0,
};

// Enhanced backoff strategy with Meta's guidelines
function getBackoffDelay(retryCount: number, errorCode?: number): number {
  const baseDelay = 1000; // Start with 1 second
  const maxDelay = 300000; // Max 5 minutes

  // If we've hit consecutive rate limits, increase the base delay
  if (rateLimitQueue.consecutiveErrors > 0) {
    const consecutiveMultiplier = Math.min(
      Math.pow(2, rateLimitQueue.consecutiveErrors),
      16
    );
    return Math.min(baseDelay * consecutiveMultiplier, maxDelay);
  }

  // Exponential backoff with jitter
  const exponentialDelay = baseDelay * Math.pow(2, retryCount);
  const jitter = Math.random() * 1000;
  return Math.min(exponentialDelay + jitter, maxDelay);
}

// Enhanced rate limit tracking
async function trackRateLimit(
  supabase: SupabaseClient,
  accountId: string,
  endpoint: string,
  headers: Record<string, string>
): Promise<void> {
  try {
    const usageHeader = headers["x-business-use-case-usage"];
    const accountUsage = headers["x-ad-account-usage"];
    const insightsThrottle = headers["x-fb-ads-insights-throttle"];

    let rateLimitInfo: Partial<RateLimitInfo> = {};

    if (usageHeader) {
      const usage = JSON.parse(usageHeader);
      rateLimitInfo = {
        usage_percent: usage.acc_id_util_pct,
        call_count: usage.call_count,
        total_cputime: usage.total_cputime,
        total_time: usage.total_time,
        estimated_time_to_regain_access: usage.estimated_time_to_regain_access,
        business_use_case: usage.business_use_case,
      };
    }

    if (accountUsage) {
      const usage = JSON.parse(accountUsage);
      rateLimitInfo.reset_time_duration = usage.reset_time_duration;
    }

    // Store rate limit info with timestamp for tracking
    await supabase.from("meta_rate_limits").upsert([
      {
        account_id: accountId,
        endpoint,
        ...rateLimitInfo,
        last_updated: new Date(),
        tier: process.env.META_API_TIER || "development",
      },
    ]);

    // If we're approaching limits, add artificial delay
    if (rateLimitInfo.usage_percent ?? 0 > 80) {
      const delayTime = calculateDynamicDelay(
        endpoint,
        rateLimitInfo.call_count || 0
      );
      await delay(delayTime);
    }
  } catch (error) {
    console.error("Error tracking rate limit:", error);
  }
}

// Helper function to track API metrics
async function trackApiMetrics(
  supabase: SupabaseClient,
  accountId: string,
  endpoint: string,
  callType: string,
  points: number,
  success: boolean,
  errorCode?: string,
  errorMessage?: string
) {
  try {
    await supabase.from("meta_api_metrics").insert([
      {
        account_id: accountId,
        endpoint,
        call_type: callType,
        points_used: points,
        success,
        error_code: errorCode,
        error_message: errorMessage,
      },
    ]);
  } catch (error: unknown) {
    console.error("Error tracking API metrics:", error);
  }
}

// Enhanced retry mechanism with rate limit awareness
async function withRateLimitRetry<T>(
  operation: () => Promise<T>,
  context: {
    accountId: string;
    endpoint: string;
    callType: string;
    points: number;
    supabase: SupabaseClient;
  }
): Promise<T> {
  let retries = 0;
  const maxRetries = 5;
  const isInsights = context.endpoint.includes("insights");

  while (true) {
    try {
      // Check if we're in a rate limit cool-down period
      if (rateLimitQueue.isProcessing) {
        const timeSinceError = Date.now() - rateLimitQueue.lastErrorTime;
        if (timeSinceError < rateLimitQueue.waitTime) {
          const remainingWait = rateLimitQueue.waitTime - timeSinceError;
          console.log(
            `Rate limit cool-down in progress. Waiting ${remainingWait}ms before retry...`
          );
          await delay(remainingWait);
        }
      }

      // Add pre-emptive delay based on operation type
      const preDelay = calculateDynamicDelay(context.endpoint, context.points);
      await delay(preDelay);

      const result = await operation();

      // Reset rate limit queue on success
      rateLimitQueue.isProcessing = false;
      rateLimitQueue.consecutiveErrors = 0;
      rateLimitQueue.waitTime = 0;

      // Track successful API call
      await trackApiMetrics(
        context.supabase,
        context.accountId,
        context.endpoint,
        context.callType,
        context.points,
        true
      );

      return result;
    } catch (error: unknown) {
      const apiError = error as {
        response?: { error?: { code?: number; message?: string } };
      };
      const errorCode = apiError?.response?.error?.code;
      const isRateLimit = [17, 80000, 80003, 80004, 4, 613].includes(
        errorCode || 0
      );

      // Track failed API call
      await trackApiMetrics(
        context.supabase,
        context.accountId,
        context.endpoint,
        context.callType,
        context.points,
        false,
        errorCode?.toString(),
        apiError?.response?.error?.message
      );

      if (isRateLimit) {
        // Update rate limit queue
        rateLimitQueue.isProcessing = true;
        rateLimitQueue.lastErrorTime = Date.now();
        rateLimitQueue.consecutiveErrors++;

        // Calculate wait time based on consecutive errors
        rateLimitQueue.waitTime = getBackoffDelay(retries, errorCode);

        if (retries >= maxRetries) {
          console.log(
            `Max retries (${maxRetries}) reached for rate limit. Throwing error.`
          );
          throw error;
        }

        console.log(
          `Rate limit hit on ${context.endpoint}. Consecutive errors: ${
            rateLimitQueue.consecutiveErrors
          }. Waiting ${rateLimitQueue.waitTime}ms before retry ${
            retries + 1
          }/${maxRetries}...`
        );

        await delay(rateLimitQueue.waitTime);
        retries++;

        // For insights API, add extra delay
        if (isInsights) {
          await delay(RATE_LIMIT_CONFIG.INSIGHTS_DELAY);
        }

        continue;
      }

      // For non-rate limit errors, throw immediately
      throw error;
    }
  }
}

// Helper function to get insights with rate limiting and error handling
async function getInsights(
  entity: Campaign | AdSet | Ad | AdAccount,
  supabase: SupabaseClient,
  accountId: string
): Promise<Record<string, unknown> | null> {
  return withRateLimitRetry(
    async () => {
      const dateRange = getLast12MonthsDateRange();
      console.log(
        "Fetching insights for entity:",
        entity.id,
        "with date range:",
        dateRange
      );

      const insights = await entity.getInsights(
        [
          "impressions",
          "clicks",
          "reach",
          "spend",
          "cpc",
          "cpm",
          "ctr",
          "frequency",
          "objective",
          "action_values",
          "actions",
          "cost_per_action_type",
          "cost_per_unique_click",
          "outbound_clicks",
          "outbound_clicks_ctr",
          "website_ctr",
          "website_purchase_roas",
        ],
        {
          time_range: dateRange,
          level: "ad",
          breakdowns: [],
        }
      );

      const processedInsights = insights?.[0] || null;

      return processedInsights;
    },
    {
      accountId,
      endpoint: "insights",
      callType: "READ",
      points: RATE_LIMIT_CONFIG.POINTS.READ,
      supabase,
    }
  );
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

// Helper function to check if data needs refresh (3 days threshold)
async function checkDataFreshness(
  supabase: SupabaseClient,
  accountId: string
): Promise<{ needsRefresh: boolean; isNewAccount: boolean }> {
  try {
    // Check account_insights table for last update
    const { data: accountData } = await supabase
      .from("meta_account_insights")
      .select("last_updated")
      .eq("account_id", accountId)
      .single();

    if (!accountData) {
      console.log(
        `No existing data found for account ${accountId}. Will fetch 12 months of data.`
      );
      return { needsRefresh: true, isNewAccount: true };
    }

    const lastUpdate = new Date(accountData.last_updated);
    const now = new Date();
    const daysSinceLastUpdate =
      (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);

    console.log(
      `Last update for account ${accountId} was ${daysSinceLastUpdate.toFixed(
        1
      )} days ago`
    );
    return {
      needsRefresh: daysSinceLastUpdate > 3,
      isNewAccount: false,
    };
  } catch (error: unknown) {
    console.error("Error checking data freshness:", error);
    // If there's an error checking, assume we need to refresh to be safe
    return { needsRefresh: true, isNewAccount: true };
  }
}

// Helper function to get date range based on account status
function getDateRange(isNewAccount: boolean) {
  const endDate = new Date();
  const startDate = new Date();

  if (isNewAccount) {
    // For new accounts, get 12 months of data
    startDate.setMonth(startDate.getMonth() - 12);
  } else {
    // For existing accounts, get last 4 days of data (including buffer)
    startDate.setDate(startDate.getDate() - 4);
  }

  return {
    since: startDate.toISOString().split("T")[0],
    until: endDate.toISOString().split("T")[0],
  };
}

// GET handler for account info and campaigns
export async function GET(request: Request) {
  const supabase = await createClient();

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

    // Check data freshness before proceeding
    const { needsRefresh, isNewAccount } = await checkDataFreshness(
      supabase,
      accountId
    );

    if (!needsRefresh) {
      console.log(`Data is fresh for account ${accountId}. Skipping fetch.`);
      // Return existing data from database
      const { data: existingData, error: fetchError } = await supabase
        .from("meta_account_insights")
        .select("*")
        .eq("account_id", accountId)
        .single();

      if (fetchError) {
        throw new Error(`Error fetching existing data: ${fetchError.message}`);
      }

      return NextResponse.json({
        result: existingData,
        message: "Data retrieved from cache",
        cached: true,
      });
    }

    // Initialize API with rate limit tracking
    const api = FacebookAdsApi.init(META_CONFIG.accessToken);
    api.setDebug(true);
    const account = new AdAccount(accountId);

    switch (action) {
      case "getAccountInfo":
        const accountInfo = await withRateLimitRetry(
          async () => {
            return account.read([
              "name",
              "account_status",
              "amount_spent",
              "balance",
              "currency",
              "spend_cap",
              "timezone_name",
              "timezone_offset_hours_utc",
              "business_country_code",
              "disable_reason",
              "is_prepay_account",
              "tax_id_status",
            ]);
          },
          {
            accountId,
            endpoint: "account_info",
            callType: "READ",
            points: RATE_LIMIT_CONFIG.POINTS.READ,
            supabase,
          }
        );

        // Use appropriate date range based on account status
        const dateRange = getDateRange(isNewAccount);
        console.log(
          `Fetching insights from ${dateRange.since} to ${dateRange.until}`
        );

        const insights = await withRateLimitRetry(
          async () => {
            return account.getInsights(
              [
                "impressions",
                "clicks",
                "reach",
                "spend",
                "cpc",
                "cpm",
                "ctr",
                "frequency",
                "objective",
                "action_values",
                "actions",
                "cost_per_action_type",
                "cost_per_unique_click",
                "outbound_clicks",
                "outbound_clicks_ctr",
                "website_ctr",
                "website_purchase_roas",
              ],
              {
                time_range: dateRange,
                level: "account",
                breakdowns: [],
              }
            );
          },
          {
            accountId,
            endpoint: "insights",
            callType: "READ",
            points: RATE_LIMIT_CONFIG.POINTS.READ,
            supabase,
          }
        );

        // Store enhanced account data
        const accountData = {
          account_id: accountId,
          name: accountInfo.name,
          account_status: accountInfo.account_status,
          amount_spent: parseFloat(accountInfo.amount_spent) || 0,
          balance: parseFloat(accountInfo.balance) || 0,
          currency: accountInfo.currency,
          spend_cap: parseFloat(accountInfo.spend_cap) || null,
          timezone_name: accountInfo.timezone_name,
          timezone_offset_hours_utc: accountInfo.timezone_offset_hours_utc,
          business_country_code: accountInfo.business_country_code,
          disable_reason: accountInfo.disable_reason,
          is_prepay_account: accountInfo.is_prepay_account,
          tax_id_status: accountInfo.tax_id_status,
          insights_start_date: new Date(dateRange.since),
          insights_end_date: new Date(dateRange.until),
          total_impressions: parseInt(insights?.[0]?.impressions ?? "0"),
          total_clicks: parseInt(insights?.[0]?.clicks ?? "0"),
          total_reach: parseInt(insights?.[0]?.reach ?? "0"),
          total_spend: parseFloat(insights?.[0]?.spend ?? "0"),
          average_cpc: parseFloat(insights?.[0]?.cpc ?? "0"),
          average_cpm: parseFloat(insights?.[0]?.cpm ?? "0"),
          average_ctr: parseFloat(insights?.[0]?.ctr ?? "0"),
          average_frequency: parseFloat(insights?.[0]?.frequency ?? "0"),
          actions: insights?.[0]?.actions || [],
          action_values: insights?.[0]?.action_values || [],
          cost_per_action_type: insights?.[0]?.cost_per_action_type || [],
          cost_per_unique_click: parseFloat(
            insights?.[0]?.cost_per_unique_click ?? "0"
          ),
          outbound_clicks: insights?.[0]?.outbound_clicks || [],
          outbound_clicks_ctr: parseFloat(
            insights?.[0]?.outbound_clicks_ctr ?? "0"
          ),
          website_ctr: insights?.[0]?.website_ctr || [],
          website_purchase_roas: parseFloat(
            insights?.[0]?.website_purchase_roas ?? "0"
          ),
          last_updated: new Date(),
          is_data_complete: isNewAccount, // Flag to indicate if we have full historical data
        };

        // Upsert with proper constraint
        const { error: upsertError } = await supabase
          .from("meta_account_insights")
          .upsert([accountData], {
            onConflict: "account_id",
            ignoreDuplicates: false,
          });

        if (upsertError) {
          throw new Error(
            `Error upserting account data: ${upsertError.message}`
          );
        }

        return NextResponse.json({
          result: { ...accountInfo, insights: insights?.[0] },
          cached: false,
          dateRange,
        });

      case "getCampaigns": {
        // Fetch directly from Meta API with rate limiting
        const campaigns = await withRateLimitRetry(
          async () => {
            console.log("Fetching campaigns from Meta API for account:", accountId);
            return account.getCampaigns(
              [
                "name",
                "status",
                "objective",
                "special_ad_categories",
                "bid_strategy",
                "budget_remaining",
                "buying_type",
                "daily_budget",
                "lifetime_budget",
                "configured_status",
                "effective_status",
                "source_campaign_id",
                "promoted_object",
                "recommendations",
                "spend_cap",
                "topline_id",
                "pacing_type",
                "start_time",
                "end_time",
              ],
              {
                limit: RATE_LIMIT_CONFIG.BATCH_SIZE,
              }
            );
          },
          {
            accountId,
            endpoint: "campaigns",
            callType: "READ",
            points: RATE_LIMIT_CONFIG.POINTS.READ,
            supabase,
          }
        );

        const processedCampaigns = [];
        for (const campaign of campaigns) {
          const campaignAdSets = [];
          const adSets = await campaign.getAdSets();
          for (const adSet of adSets) {
            const adSetAds = [];
            const ads = await adSet.getAds();
            for (const ad of ads) {
              try {
                // Get ad insights with all new metrics
                const adInsights = await getInsights(new Ad(ad.id), supabase, accountId);

                // Store enhanced ad data with all new columns aligned with Supabase schema
                const adRecord = {
                  ad_id: ad.id,
                  account_id: accountId,
                  ad_set_id: adSet.id,
                  campaign_id: campaign.id,
                  name: ad.name,
                  status: ad.status,
                  creative: ad.creative || null,
                  tracking_specs: ad.tracking_specs || null,
                  conversion_specs: ad.conversion_specs || null,
                  preview_url: ad.preview_shareable_link || null,
                  creative_id: ad.creative?.id || null,
                  effective_object_story_id: ad.effective_object_story_id || null,
                  configured_status: ad.configured_status || null,
                  effective_status: ad.effective_status || null,
                  issues_info: ad.issues_info || [],
                  source_ad_id: ad.source_ad_id || null,
                  engagement_audience: ad.engagement_audience || null,
                  object_story_spec: ad.object_story_spec || null,
                  recommendations: ad.recommendations || [],
                  tracking_and_conversion_specs: ad.tracking_and_conversion_specs || null,
                };

                // Upsert ad record here as needed
                const { error: adError } = await supabase
                  .from("meta_ads")
                  .upsert([adRecord], {
                    onConflict: "ad_id",
                    ignoreDuplicates: false,
                  });

                if (adError) {
                  console.error("Error storing ad:", adError);
                  console.error("Failed ad record:", adRecord);
                  continue;
                }

                console.log("Successfully stored ad:", ad.id);
                adSetAds.push(adRecord);

                await delay(RATE_LIMIT_CONFIG.BURST_DELAY);
              } catch (error) {
                console.error(`Error processing ad ${ad.id}:`, error);
                continue;
              }
            }
            campaignAdSets.push({
              adSet: adSet,
              ads: adSetAds,
            });
            await delay(RATE_LIMIT_CONFIG.BURST_DELAY);
          }
          processedCampaigns.push({
            campaign: campaign,
            adSets: campaignAdSets,
          });
        }

        return NextResponse.json({
          result: {
            campaigns: processedCampaigns,
            pagination: {
              page: 1,
              pageSize: RATE_LIMIT_CONFIG.BATCH_SIZE,
              total: processedCampaigns.length,
              fromApi: true,
            },
          },
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error("Error:", error);

    // Handle rate limit errors
    if (error && typeof error === 'object' && 'response' in error && (error as any).response?.error?.code === 17) {
      return NextResponse.json(
        {
          error: "Rate limit reached. Please try again in a few minutes.",
          retryAfter: RATE_LIMIT_CONFIG.STANDARD.BLOCK_TIME,
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

    if (action === "initializeApi") {
      // Removed call to undefined initializeApi. Return a placeholder response.
      return NextResponse.json({ error: "initializeApi not implemented" }, { status: 501 });
    }

    const data = await request.json();

    // Initialize Meta API
    try {
      // Removed call to undefined initializeApi
      // await initializeApi(META_CONFIG.accessToken);
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
