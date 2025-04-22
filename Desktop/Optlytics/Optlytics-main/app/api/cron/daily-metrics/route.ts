import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { FacebookAdsApi, AdAccount } from "facebook-nodejs-business-sdk";

const CRON_SECRET = process.env.CRON_SECRET;
const BATCH_SIZE = 5; // Process 5 accounts at a time
const BATCH_DELAY = 60000; // 1 minute between batches
const API_CALL_DELAY = 2000; // 2 seconds between API calls

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

// Helper function to get yesterday's date range
function getYesterdayDateRange() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const start = new Date(yesterday);
  start.setHours(0, 0, 0, 0);
  const end = new Date(yesterday);
  end.setHours(23, 59, 59, 999);

  return {
    since: start.toISOString().split("T")[0],
    until: end.toISOString().split("T")[0],
  };
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
    const dateRange = getYesterdayDateRange();

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

    // Get existing metrics for yesterday
    const { data: existingMetrics } = await supabase
      .from("meta_daily_metrics")
      .select("*")
      .eq("date", dateRange.since)
      .in(
        "account_id",
        accounts.map((a) => a.account_id)
      );

    // Identify accounts needing updates
    const accountsNeedingUpdate = accounts.filter((account) => {
      const hasMetrics = existingMetrics?.some(
        (m) =>
          m.account_id === account.account_id &&
          m.date === dateRange.since &&
          m.last_updated
      );
      return forceUpdate || !hasMetrics;
    });

    // Start background update for accounts needing it
    if (accountsNeedingUpdate.length > 0) {
      // Initialize Meta API for updates
      const api = FacebookAdsApi.init(process.env.META_ACCESS_TOKEN!);
      api.setDebug(true);

      // Process accounts in background
      (async () => {
        const batches = chunk(accountsNeedingUpdate, BATCH_SIZE);
        const results = {
          total_accounts: accountsNeedingUpdate.length,
          processed_accounts: 0,
          successful_updates: 0,
          failed_updates: 0,
          errors: [] as Array<{ account_id: string; error: string }>,
        };

        for (const [batchIndex, batch] of batches.entries()) {
          for (const account of batch) {
            try {
              await delay(API_CALL_DELAY);
              const adAccount = new AdAccount(account.account_id);

              const insights = await adAccount.getInsights(
                [
                  "impressions",
                  "clicks",
                  "spend",
                  "reach",
                  "conversions",
                  "actions",
                ],
                {
                  time_range: dateRange,
                  level: "account",
                }
              );

              if (insights && insights.length > 0) {
                const dailyData = {
                  account_id: account.account_id,
                  date: dateRange.since,
                  impressions: parseInt(insights[0].impressions || "0"),
                  clicks: parseInt(insights[0].clicks || "0"),
                  spend: parseFloat(insights[0].spend || "0"),
                  reach: parseInt(insights[0].reach || "0"),
                  conversions: insights[0].actions || [],
                  last_updated: new Date().toISOString(),
                };

                await supabase.from("meta_daily_metrics").upsert([dailyData], {
                  onConflict: "account_id,date",
                });

                results.successful_updates++;
              }
              results.processed_accounts++;
            } catch (error) {
              results.failed_updates++;
              results.errors.push({
                account_id: account.account_id,
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
            type: "daily_metrics",
            date: dateRange.since,
            results: results,
            completed_at: new Date(),
          },
        ]);
      })().catch(console.error);
    }

    // Return existing data immediately
    return NextResponse.json({
      success: true,
      data: {
        metrics: existingMetrics || [],
        date: dateRange,
      },
      meta: {
        total_accounts: accounts.length,
        accounts_needing_update: accountsNeedingUpdate.length,
        is_updating: accountsNeedingUpdate.length > 0,
        last_updated: existingMetrics?.[0]?.last_updated || null,
      },
    });
  } catch (error) {
    console.error("Daily metrics sync failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
