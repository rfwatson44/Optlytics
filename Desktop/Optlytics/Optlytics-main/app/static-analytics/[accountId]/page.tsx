"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function StaticAnalyticsPage() {
  const params = useParams();
  const pathname = usePathname();
  const { accountId } = params;
  const [accountName, setAccountName] = useState(accountId);

  useEffect(() => {
    async function fetchAccountName() {
      const { data } = await supabase
        .from("accounts")
        .select("account_name")
        .eq("account_id", accountId)
        .single();
      if (data) setAccountName(data.account_name);
    }
    fetchAccountName();
  }, [accountId]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <nav className="text-xs text-gray-500 mb-2">
        <Link href="/">Home</Link>
        {" > "}
        <span>{accountName}</span>
        {" > Static Analytics"}
      </nav>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Static Analytics</h1>
      </div>
      {/* Add your static analytics content here */}
    </div>
  );
}
