import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { FacebookAdsApi, AdAccount } from "facebook-nodejs-business-sdk";

const CRON_SECRET = process.env.CRON_SECRET;
const BATCH_SIZE = 3;
const BATCH_DELAY = 60000;
const API_CALL_DELAY = 2000;

// Helper function to delay execution
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper function to chunk array into batches
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Helper function to get last week's date range
function getLastWeekDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);

  return {
    since: start.toISOString().split("T")[0],
    until: end.toISOString().split("T")[0],
  };
}

interface ErrorLog {
  type: "account" | "campaign" | "ad_set" | "ad";
  id: string;
  error: string;
}

interface UpdateResults {
  total_accounts: number;
  processed_accounts: number;
  campaigns_updated: number;
  ad_sets_updated: number;
  ads_updated: number;
  errors: ErrorLog[];
}

// Helper function to get creative thumbnail URL
async function getCreativeThumbnail(creative: any, adAccount: AdAccount) {
  try {
    if (!creative || !creative.id) return null;

    await delay(API_CALL_DELAY);
    const creativeDetails = await adAccount.getAdCreatives(
      [
        "thumbnail_url",
        "image_url",
        "object_story_spec",
        "object_type",
        "video_id",
      ],
      {
        filtering: [
          {
            field: "id",
            operator: "EQUAL",
            value: creative.id,
          },
        ],
      }
    );

    if (!creativeDetails || creativeDetails.length === 0) return null;

    const creativeDetail = creativeDetails[0];

    // Try different possible thumbnail sources
    return (
      creativeDetail.thumbnail_url || // Direct thumbnail URL
      creativeDetail.image_url || // Image URL for image ads
      (creativeDetail.object_story_spec?.instagram_actor_id &&
        creativeDetail.object_story_spec?.link_data?.picture) || // Instagram ad image
      (creativeDetail.object_story_spec?.page_id &&
        creativeDetail.object_story_spec?.link_data?.picture) || // Facebook ad image
      null
    );
  } catch (error) {
    console.error("Error fetching creative thumbnail:", error);
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");
    const forceUpdate = searchParams.get("force") === "true";

    if (secret !== CRON_SECRET && process.env.NODE_ENV !== "development") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const dateRange = getLastWeekDateRange();

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

    // Get existing data
    const { data: existingCampaigns } = await supabase
      .from("meta_campaigns")
      .select("*")
      .in(
        "account_id",
        accounts.map((a) => a.account_id)
      );

    const { data: existingAdSets } = await supabase
      .from("meta_ad_sets")
      .select("*")
      .in(
        "campaign_id",
        (existingCampaigns || []).map((c) => c.campaign_id)
      );

    const { data: existingAds } = await supabase
      .from("meta_ads")
      .select("*")
      .in(
        "ad_set_id",
        (existingAdSets || []).map((as) => as.ad_set_id)
      );

    // Start background update for all accounts to check for weekly changes
    // Initialize Meta API for updates
    const api = FacebookAdsApi.init(process.env.META_ACCESS_TOKEN!);
    api.setDebug(true);

    // Process accounts in background
    (async () => {
      const batches = chunk(accounts, BATCH_SIZE);
      const results: UpdateResults = {
        total_accounts: accounts.length,
        processed_accounts: 0,
        campaigns_updated: 0,
        ad_sets_updated: 0,
        ads_updated: 0,
        errors: [],
      };

      for (const [batchIndex, batch] of batches.entries()) {
        for (const account of batch) {
          try {
            await delay(API_CALL_DELAY);
            const adAccount = new AdAccount(account.account_id);

            // Fetch campaigns updated in the last week
            const campaigns = await adAccount.getCampaigns(
              [
                "name",
                "status",
                "objective",
                "special_ad_categories",
                "updated_time", // Include update time
              ],
              {
                limit: 100,
                filtering: [
                  {
                    field: "updated_time",
                    operator: "GREATER_THAN",
                    value: dateRange.since,
                  },
                ],
              }
            );

            for (const campaign of campaigns) {
              try {
                await delay(API_CALL_DELAY);
                const campaignData = {
                  campaign_id: campaign.id,
                  account_id: account.account_id,
                  name: campaign.name,
                  status: campaign.status,
                  objective: campaign.objective,
                  special_ad_categories: campaign.special_ad_categories,
                  last_updated: new Date(),
                };

                await supabase
                  .from("meta_campaigns")
                  .upsert([campaignData], { onConflict: "campaign_id" });

                results.campaigns_updated++;

                // Fetch ad sets updated in the last week
                const adSets = await campaign.getAdSets(
                  [
                    "name",
                    "status",
                    "targeting",
                    "billing_event",
                    "optimization_goal",
                    "bid_strategy",
                    "updated_time",
                  ],
                  {
                    filtering: [
                      {
                        field: "updated_time",
                        operator: "GREATER_THAN",
                        value: dateRange.since,
                      },
                    ],
                  }
                );

                for (const adSet of adSets) {
                  try {
                    await delay(API_CALL_DELAY);
                    const adSetData = {
                      ad_set_id: adSet.id,
                      campaign_id: campaign.id,
                      name: adSet.name,
                      status: adSet.status,
                      targeting: adSet.targeting,
                      billing_event: adSet.billing_event,
                      optimization_goal: adSet.optimization_goal,
                      bid_strategy: adSet.bid_strategy,
                      last_updated: new Date(),
                    };

                    await supabase
                      .from("meta_ad_sets")
                      .upsert([adSetData], { onConflict: "ad_set_id" });

                    results.ad_sets_updated++;

                    // Fetch ads updated in the last week
                    const ads = await adSet.getAds(
                      [
                        "name",
                        "status",
                        "creative",
                        "tracking_specs",
                        "conversion_specs",
                        "preview_shareable_link",
                        "updated_time",
                        "creative_id",
                      ],
                      {
                        filtering: [
                          {
                            field: "updated_time",
                            operator: "GREATER_THAN",
                            value: dateRange.since,
                          },
                        ],
                      }
                    );

                    for (const ad of ads) {
                      try {
                        await delay(API_CALL_DELAY);

                        // Get thumbnail URL for the ad
                        const thumbnailUrl = await getCreativeThumbnail(
                          ad.creative,
                          adAccount
                        );
                        console.log(
                          { thumbnailUrl },
                          "this is the thumbnail url"
                        );

                        const adData = {
                          ad_id: ad.id,
                          ad_set_id: adSet.id,
                          name: ad.name,
                          status: ad.status,
                          creative: ad.creative,
                          tracking_specs: ad.tracking_specs,
                          conversion_specs: ad.conversion_specs,
                          preview_url: ad.preview_shareable_link,
                          thumbnail_url: thumbnailUrl,
                          last_updated: new Date(),
                        };

                        await supabase
                          .from("meta_ads")
                          .upsert([adData], { onConflict: "ad_id" });

                        results.ads_updated++;
                      } catch (error) {
                        results.errors.push({
                          type: "ad",
                          id: ad.id,
                          error:
                            error instanceof Error
                              ? error.message
                              : "Unknown error",
                        });
                      }
                    }
                  } catch (error) {
                    results.errors.push({
                      type: "ad_set",
                      id: adSet.id,
                      error:
                        error instanceof Error
                          ? error.message
                          : "Unknown error",
                    });
                  }
                }
              } catch (error) {
                results.errors.push({
                  type: "campaign",
                  id: campaign.id,
                  error:
                    error instanceof Error ? error.message : "Unknown error",
                });
              }
            }
            results.processed_accounts++;
          } catch (error) {
            results.errors.push({
              type: "account",
              id: account.account_id,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }

        if (batchIndex < batches.length - 1) {
          await delay(BATCH_DELAY);
        }
      }

      // Store final results in Supabase for tracking
      await supabase.from("meta_sync_logs").insert([
        {
          type: "weekly_details",
          date_range: dateRange,
          results: results,
          completed_at: new Date(),
        },
      ]);
    })().catch(console.error);

    // Return existing data immediately
    return NextResponse.json({
      success: true,
      data: {
        campaigns: existingCampaigns || [],
        adSets: existingAdSets || [],
        ads: existingAds || [],
      },
      meta: {
        total_accounts: accounts.length,
        date_range: dateRange,
        is_updating: true,
        last_updated: existingCampaigns?.[0]?.last_updated || null,
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
