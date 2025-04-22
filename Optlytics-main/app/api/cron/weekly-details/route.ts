import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  FacebookAdsApi,
  AdAccount,
  Campaign,
} from "facebook-nodejs-business-sdk";

type MetaCampaign = {
  id: string;
  name: string;
  status: string;
  objective: string;
  special_ad_categories?: string[];
  bid_strategy?: string;
  budget_remaining?: number;
  buying_type?: string;
  daily_budget?: number;
  lifetime_budget?: number;
};

// Types for Meta API responses
interface MetaApiError {
  response?: {
    error?: {
      code?: number;
      message?: string;
    };
  };
}

interface MetaPaging {
  cursors?: {
    after?: string;
  };
}

interface MetaResponse<T> {
  data?: T[];
  paging?: MetaPaging;
}

interface Creative {
  id: string;
  name?: string;
  title?: string;
  body?: string;
  object_type?: string;
  thumbnail_url?: string;
  image_url?: string;
  video_id?: string;
  url_tags?: string;
  template_url?: string;
  instagram_permalink_url?: string;
  effective_object_story_id?: string;
  asset_feed_spec?: unknown;
  object_story_spec?: unknown;
  platform_customizations?: unknown;
}

interface AdSet {
  id: string;
  name: string;
  status: string;
  targeting: Record<string, unknown>;
  billing_event: string;
  optimization_goal: string;
  bid_strategy: string;
  attribution_spec: unknown;
  promoted_object: unknown;
  pacing_type: string;
  getAds: (
    fields: string[],
    options?: Record<string, unknown>
  ) => Promise<MetaResponse<Ad>>;
}

interface Ad {
  id: string;
  name: string;
  status: string;
  creative: Creative;
  tracking_specs: unknown;
  conversion_specs: unknown;
  preview_shareable_link: string;
  effective_object_story_id: string;
  creative_id: string;
}

const CRON_SECRET = process.env.CRON_SECRET;
const BATCH_SIZE = 5;
const BATCH_DELAY = 60000;
const API_CALL_DELAY = 2000;
const MAX_RETRIES = 3;

// Helper function to delay execution
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Exponential backoff delay
const getBackoffDelay = (retryCount: number) => {
  return Math.min(1000 * Math.pow(2, retryCount), 300000); // Max 5 minutes
};

// Helper function to chunk array into batches
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Helper function to handle rate limits with exponential backoff
async function withRateLimitRetry<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  let retries = 0;
  while (true) {
    try {
      return await operation();
    } catch (error: unknown) {
      const apiError = error as MetaApiError;
      const isRateLimit =
        apiError?.response?.error?.code === 17 ||
        apiError?.response?.error?.code === 80000 ||
        apiError?.response?.error?.code === 80003 ||
        apiError?.response?.error?.code === 80004;

      if (!isRateLimit || retries >= MAX_RETRIES) {
        throw error;
      }

      const backoffDelay = getBackoffDelay(retries);
      console.log(
        `Rate limit hit on ${context}. Retrying in ${backoffDelay}ms...`
      );
      await delay(backoffDelay);
      retries++;
    }
  }
}

// Helper function to get creative details with enhanced fields
async function getCreativeDetails(creative: Creative, adAccount: AdAccount) {
  if (!creative || !creative.id) return null;

  return await withRateLimitRetry(async () => {
    const creativeDetails = await adAccount.getAdCreatives(
      [
        "id",
        "name",
        "title",
        "body",
        "object_type",
        "thumbnail_url",
        "image_url",
        "video_id",
        "url_tags",
        "template_url",
        "instagram_permalink_url",
        "effective_object_story_id",
        "asset_feed_spec",
        "object_story_spec",
        "platform_customizations",
      ],
      {
        filtering: [{ field: "id", operator: "EQUAL", value: creative.id }],
      }
    );

    if (!creativeDetails || creativeDetails.length === 0) return null;

    const detail = creativeDetails[0];
    return {
      thumbnail_url: detail.thumbnail_url || detail.image_url,
      creative_type: detail.object_type,
      asset_feed_spec: detail.asset_feed_spec,
      url_tags: detail.url_tags,
      template_url: detail.template_url,
      instagram_permalink_url: detail.instagram_permalink_url,
      effective_object_story_id: detail.effective_object_story_id,
      platform_customizations: detail.platform_customizations,
    };
  }, `getCreativeDetails-${creative.id}`);
}

// Helper function to get all items with pagination
async function getAllItems<T>(
  fetcher: (after?: string) => Promise<MetaResponse<T>>,
  context: string
): Promise<T[]> {
  let allItems: T[] = [];
  let hasNextPage = true;
  let after: string | undefined;

  while (hasNextPage) {
    try {
      const response = await withRateLimitRetry(
        () => fetcher(after),
        `${context}-page`
      );

      // Handle Facebook API response format
      if (Array.isArray(response)) {
        allItems = allItems.concat(response as T[]);

        // Check if there's a next page in the response
        const paging = (response as MetaResponse<T>).paging;
        if (paging?.cursors?.after) {
          after = paging.cursors.after;
        } else {
          hasNextPage = false;
        }
      } else if (response?.data) {
        allItems = allItems.concat(response.data);

        if (response.paging?.cursors?.after) {
          after = response.paging.cursors.after;
        } else {
          hasNextPage = false;
        }
      } else {
        hasNextPage = false;
      }

      if (hasNextPage) {
        await delay(API_CALL_DELAY);
      }
    } catch (error: unknown) {
      const apiError = error as MetaApiError;
      if (
        apiError?.response?.error?.code === 100 &&
        apiError?.response?.error?.message?.includes("Invalid cursor")
      ) {
        // If we get an invalid cursor error, stop pagination
        console.warn(
          `Invalid cursor encountered in ${context}, stopping pagination`
        );
        hasNextPage = false;
      } else {
        throw error;
      }
    }
  }

  return allItems;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");

    if (secret !== CRON_SECRET && process.env.NODE_ENV !== "development") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();

    // Get all accounts
    const { data: accounts, error: accountsError } = await supabase
      .from("meta_account_insights")
      .select("account_id");

    if (accountsError) {
      throw new Error(`Failed to fetch accounts: ${accountsError.message}`);
    }

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No accounts to process",
      });
    }

    // Initialize Meta API
    const api = FacebookAdsApi.init(process.env.META_ACCESS_TOKEN!);
    api.setDebug(true);

    // Process accounts in background
    (async () => {
      const batches = chunk(accounts, BATCH_SIZE);

      for (const [batchIndex, batch] of batches.entries()) {
        for (const account of batch) {
          try {
            const adAccount = new AdAccount(account.account_id);

            // Fetch all campaigns without limit
            const campaigns = await getAllItems<MetaCampaign>(
              async (after?: string) => {
                const options = {
                  limit: 100,
                  fields: [
                    "name",
                    "status",
                    "objective",
                    "special_ad_categories",
                    "bid_strategy",
                    "budget_remaining",
                    "buying_type",
                    "daily_budget",
                    "lifetime_budget",
                  ] as const,
                  ...(after ? { after } : {}),
                };

                return adAccount.getCampaigns([], options);
              },
              `campaigns-${account.account_id}`
            );

            for (const campaign of campaigns as MetaCampaign[]) {
              await withRateLimitRetry(async () => {
                // Store campaign data
                const campaignData = {
                  campaign_id: campaign.id,
                  account_id: account.account_id,
                  name: campaign.name,
                  status: campaign.status,
                  objective: campaign.objective,
                  special_ad_categories: campaign.special_ad_categories,
                  bid_strategy: campaign.bid_strategy,
                  budget_remaining: campaign.budget_remaining,
                  buying_type: campaign.buying_type,
                  daily_budget: campaign.daily_budget,
                  lifetime_budget: campaign.lifetime_budget,
                  last_updated: new Date(),
                };

                await supabase
                  .from("meta_campaigns")
                  .upsert([campaignData], { onConflict: "campaign_id" });

                // Fetch all ad sets for this campaign
                const adSets = await getAllItems<AdSet>(
                  async (after?: string) => {
                    const options = {
                      limit: 100,
                      fields: [
                        "name",
                        "status",
                        "targeting",
                        "billing_event",
                        "optimization_goal",
                        "bid_strategy",
                        "attribution_spec",
                        "promoted_object",
                        "pacing_type",
                      ] as const,
                      ...(after ? { after } : {}),
                    };

                    const campaignInstance = new Campaign(campaign.id);
                    return campaignInstance.getAdSets([], options);
                  },
                  `adsets-${campaign.id}`
                );

                for (const adSet of adSets) {
                  // Store ad set data
                  const adSetData = {
                    ad_set_id: adSet.id,
                    campaign_id: campaign.id,
                    name: adSet.name,
                    status: adSet.status,
                    targeting: adSet.targeting,
                    billing_event: adSet.billing_event,
                    optimization_goal: adSet.optimization_goal,
                    bid_strategy: adSet.bid_strategy,
                    attribution_spec: adSet.attribution_spec,
                    promoted_object: adSet.promoted_object,
                    pacing_type: adSet.pacing_type,
                    last_updated: new Date(),
                  };

                  await supabase
                    .from("meta_ad_sets")
                    .upsert([adSetData], { onConflict: "ad_set_id" });

                  // Fetch all ads for this ad set
                  const ads = await getAllItems<Ad>(async (after?: string) => {
                    const options = {
                      limit: 100,
                      fields: [
                        "name",
                        "status",
                        "creative",
                        "tracking_specs",
                        "conversion_specs",
                        "preview_shareable_link",
                        "effective_object_story_id",
                        "creative_id",
                      ] as const,
                      ...(after ? { after } : {}),
                    };

                    return adSet.getAds([], options);
                  }, `ads-${adSet.id}`);

                  for (const ad of ads) {
                    // Get enhanced creative details
                    const creativeDetails = await getCreativeDetails(
                      ad.creative,
                      adAccount
                    );

                    // Store ad data
                    const adData = {
                      ad_id: ad.id,
                      ad_set_id: adSet.id,
                      name: ad.name,
                      status: ad.status,
                      creative: ad.creative,
                      tracking_specs: ad.tracking_specs,
                      conversion_specs: ad.conversion_specs,
                      preview_url: ad.preview_shareable_link,
                      creative_id: ad.creative?.id,
                      effective_object_story_id: ad.effective_object_story_id,
                      ...creativeDetails,
                      last_updated: new Date(),
                    };

                    await supabase
                      .from("meta_ads")
                      .upsert([adData], { onConflict: "ad_id" });
                  }

                  await delay(API_CALL_DELAY);
                }
              }, `campaign-processing-${campaign.id}`);
            }
          } catch (error) {
            console.error(
              `Error processing account ${account.account_id}:`,
              error
            );
          }
        }

        if (batchIndex < batches.length - 1) {
          await delay(BATCH_DELAY);
        }
      }

      console.log("Weekly details update completed");
    })().catch(console.error);

    return NextResponse.json({
      success: true,
      message: "Update process started",
      meta: {
        total_accounts: accounts.length,
        is_updating: true,
      },
    });
  } catch (error) {
    console.error("Weekly details update failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
