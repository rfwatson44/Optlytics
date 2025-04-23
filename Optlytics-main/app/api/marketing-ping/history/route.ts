import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Get ping history from the database (most recent 50 entries)
    const { data, error } = await supabase
      .from("meta_api_pings")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(50);

    if (error) {
      throw new Error(`Failed to fetch ping history: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error("Error fetching marketing ping history:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
