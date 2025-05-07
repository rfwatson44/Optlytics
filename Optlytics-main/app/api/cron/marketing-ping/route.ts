import { NextResponse } from "next/server";
import { FacebookAdsApi, AdAccount } from "facebook-nodejs-business-sdk";
import { createClient } from "@/utils/supabase/server";

const CRON_SECRET = process.env.CRON_SECRET;

// Define interfaces for our API result types
interface ApiResults {
  account_info: Record<string, unknown> | null;
  campaigns: unknown[] | ErrorResult | null;
  insights: unknown[] | ErrorResult | null;
  management_test: ManagementTestResult | ErrorResult | null;
}

interface ErrorResult {
  error: string;
  status?: number;
}

interface ManagementTestResult {
  success: boolean;
  creatives_count: number;
}

export async function GET(request: Request) {
  try {
    // Validate the cron secret
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");

    if (secret !== CRON_SECRET && process.env.NODE_ENV !== "development") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Initialize the Meta API
    const api = FacebookAdsApi.init(process.env.META_ACCESS_TOKEN!);
    api.setDebug(false);

    // META_ACCOUNT_ID is already in our env
    const accountId = `act_${process.env.META_ACCOUNT_ID}`;

    if (!accountId) {
      throw new Error(
        "META_ACCOUNT_ID is not defined in environment variables"
      );
    }

    // Create a simple, reliable API call that will succeed
    const adAccount = new AdAccount(accountId);

    // Track API call results for different permission tests
    const results: ApiResults = {
      account_info: null,
      campaigns: null,
      insights: null,
      management_test: null,
    };

    // Create proper date format for time range (YYYY-MM-DD)
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);

    const formatDate = (date: Date): string => {
      return date.toISOString().split("T")[0]; // YYYY-MM-DD format
    };

    // 1. Test ads_read permissions - Get basic account info
    const accountDetails = await adAccount.read([
      "name",
      "account_status",
      "currency",
      "business_country_code",
      "timezone_name",
    ]);
    results.account_info = accountDetails;

    // 2. Test insights permissions - Get simple campaign insights
    try {
      const insights = await adAccount.getInsights(
        ["impressions", "clicks", "spend"],
        {
          time_range: {
            since: formatDate(sevenDaysAgo),
            until: formatDate(today),
          },
          level: "account",
        }
      );
      console.log(insights);
      results.insights = insights;
    } catch (error) {
      // If insights fail, log but continue
      console.error("Insights API call failed:", error);
      results.insights = {
        error:
          error instanceof Error
            ? error.message
            : "Unknown error in insights call",
        status: 400,
      };
    }

    // 3. Test ads_management permissions - Get campaigns
    try {
      const campaigns = await adAccount.getCampaigns(
        ["name", "status", "objective"],
        { limit: 5 }
      );
      console.log(campaigns);
      results.campaigns = campaigns;
    } catch (error) {
      // If campaigns fail, log but continue
      console.error("Campaign retrieval failed:", error);
      results.campaigns = {
        error:
          error instanceof Error
            ? error.message
            : "Unknown error in campaigns call",
        status: 400,
      };
    }

    // 4. Test a basic management permission check (doesn't make actual changes)
    try {
      // Just check if the API can access ad management endpoints
      // without actually creating/modifying anything
      const fields = ["id", "name"];
      const params = { limit: 1 };
      const adCreatives = await adAccount.getAdCreatives(fields, params);
      results.management_test = {
        success: true,
        creatives_count: adCreatives?.length || 0,
      };
    } catch (error) {
      console.error("Management permission test failed:", error);
      results.management_test = {
        error:
          error instanceof Error
            ? error.message
            : "Unknown error in management test",
        status: 400,
      };
    }

    // Helper function to check if a result is an error
    const isErrorResult = (result: unknown): result is ErrorResult => {
      return (
        result !== null &&
        typeof result === "object" &&
        "error" in result &&
        typeof (result as ErrorResult).error === "string"
      );
    };

    // Check if any of the API calls failed
    const hasErrors =
      isErrorResult(results.insights) ||
      isErrorResult(results.campaigns) ||
      isErrorResult(results.management_test);

    const errors = [];
    if (isErrorResult(results.insights))
      errors.push({ type: "insights", ...results.insights });
    if (isErrorResult(results.campaigns))
      errors.push({ type: "campaigns", ...results.campaigns });
    if (isErrorResult(results.management_test))
      errors.push({ type: "management", ...results.management_test });

    // Log the ping to Supabase, successful or not
    const supabase = await createClient();
    await supabase.from("meta_api_pings").upsert([
      {
        account_id: accountId,
        successful: !hasErrors,
        timestamp: new Date().toISOString(),
        details: {
          account_info: results.account_info,
          insights_available:
            results.insights && !isErrorResult(results.insights),
          campaigns_available:
            results.campaigns && !isErrorResult(results.campaigns),
          management_permission:
            results.management_test && !isErrorResult(results.management_test),
          errors: errors.length > 0 ? errors : null,
        },
      },
    ]);

    // If there were any errors, return 400 status for Vercel logs visibility
    if (hasErrors) {
      return NextResponse.json(
        {
          success: false,
          timestamp: new Date().toISOString(),
          message: "Meta Marketing API ping completed with errors",
          details: {
            account_id: accountId,
            permissions_tested: ["ads_read", "ads_insight", "ads_management"],
            errors,
          },
        },
        { status: 400 }
      );
    }

    console.log({
      success: true,
      timestamp: new Date().toISOString(),
      message:
        "Successfully pinged Meta Marketing API with expanded permissions",
      details: {
        account_id: accountId,
        account_info: results.account_info,
        permissions_tested: ["ads_read", "ads_insight", "ads_management"],
      },
    });
    // Return success response
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      message:
        "Successfully pinged Meta Marketing API with expanded permissions",
      details: {
        account_id: accountId,
        account_info: results.account_info,
        permissions_tested: ["ads_read", "ads_insight", "ads_management"],
      },
    });
  } catch (error) {
    console.error("Meta Marketing API ping failed:", error);

    // Log the failed ping to Supabase
    try {
      const supabase = await createClient();
      await supabase.from("meta_api_pings").insert([
        {
          account_id: process.env.META_ACCOUNT_ID,
          successful: false,
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : "Unknown error",
        },
      ]);
    } catch (logError) {
      console.error("Failed to log ping error:", logError);
    }

    // Return error response with 400 status for Vercel logs visibility
    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 }
    );
  }
}
