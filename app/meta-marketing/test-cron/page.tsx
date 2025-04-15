"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

interface CronJobResult {
  success: boolean;
  date?: {
    since: string;
    until: string;
  };
  results?: {
    accounts_processed?: number;
    campaigns_updated?: number;
    ad_sets_updated?: number;
    ads_updated?: number;
    errors?: Array<{
      type: string;
      id: string;
      error: string;
    }>;
  };
  error?: string;
}

export default function TestCronPage() {
  const [selectedJob, setSelectedJob] = useState("daily-metrics");
  const [results, setResults] = useState<CronJobResult | null>(null);

  const { mutate: runCronJob, isPending } = useMutation<CronJobResult, Error>({
    mutationFn: async () => {
      const response = await fetch(
        `/api/cron/${selectedJob}?secret=${process.env.NEXT_PUBLIC_CRON_SECRET}`
      );
      if (!response.ok) {
        throw new Error("Failed to run cron job");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setResults(data);
    },
    onError: (error) => {
      console.error("Error running cron job:", error);
      setResults({
        success: false,
        error: error.message,
      });
    },
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Test Cron Jobs</h1>

      <div className="mb-6">
        <select
          value={selectedJob}
          onChange={(e) => setSelectedJob(e.target.value)}
          className="border p-2 rounded mr-4"
        >
          <option value="daily-metrics">Daily Metrics Sync</option>
          <option value="weekly-details">Weekly Ad Details Update</option>
        </select>

        <button
          onClick={() => runCronJob()}
          disabled={isPending}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
        >
          {isPending ? "Running..." : "Run Job"}
        </button>
      </div>

      {results && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-4">Results:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
