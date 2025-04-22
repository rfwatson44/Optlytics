import { NextResponse } from "next/server";
import { FacebookAdsApi, AdAccount } from "facebook-nodejs-business-sdk";
import { createClient } from "@/utils/supabase/server";

const CRON_SECRET = process.env.CRON_SECRET;

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

    // Get basic account info - this is one of the most reliable API calls
    const accountDetails = await adAccount.read([
      "name",
      "account_status",
      "currency",
    ]);

    // Log the successful ping to Supabase
    const supabase = await createClient();
    await supabase.from("meta_api_pings").upsert([
      {
        account_id: accountId,
        successful: true,
        timestamp: new Date().toISOString(),
        details: {
          name: accountDetails?.name,
          account_status: accountDetails?.account_status,
          currency: accountDetails?.currency,
        },
      },
    ]);

    // Return success response
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: "Successfully pinged Meta Marketing API",
      details: {
        account_id: accountId,
        name: accountDetails?.name,
        account_status: accountDetails?.account_status,
        currency: accountDetails?.currency,
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

    // Return error response
    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
