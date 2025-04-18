"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Campaign {
  id: string;
  name: string;
  status: string;
  objective: string;
}

const API_BASE_URL = "/api/meta-marketing";

export default function MetaApiTest() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string>("");

  // Query for getting campaigns
  const { data: campaigns, isLoading: isLoadingCampaigns } = useQuery<
    Campaign[]
  >({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}?action=getCampaigns`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch campaigns");
      }
      return response.json();
    },
  });

  // Mutation for creating a campaign
  const createCampaign = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_BASE_URL}?action=createCampaign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `Test Campaign ${new Date().toISOString()}`,
          objective: "PAGE_LIKES",
          status: "PAUSED", // Always create as paused for safety
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create campaign");
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate campaigns query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setError("");
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  // Query for getting account info
  const { data: accountInfo, isLoading: isLoadingAccount } = useQuery({
    queryKey: ["accountInfo"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}?action=getAccountInfo`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch account info");
      }
      return response.json();
    },
  });

  const handleCreateCampaign = () => {
    createCampaign.mutate();
  };

  if (isLoadingAccount) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        Loading account information...
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Meta Marketing API Test</h1>

      {/* Account Information */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Account Information</h2>
        {accountInfo && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600">Name</p>
              <p className="font-medium">{accountInfo.name}</p>
            </div>
            <div>
              <p className="text-gray-600">Status</p>
              <p className="font-medium">{accountInfo.account_status}</p>
            </div>
            <div>
              <p className="text-gray-600">Amount Spent</p>
              <p className="font-medium">
                {accountInfo.amount_spent} {accountInfo.currency}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Balance</p>
              <p className="font-medium">
                {accountInfo.balance} {accountInfo.currency}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Create Campaign Button */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Test Operations</h2>
          <button
            onClick={handleCreateCampaign}
            disabled={createCampaign.isPending}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {createCampaign.isPending ? "Creating..." : "Create Test Campaign"}
          </button>
        </div>
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded mt-4">{error}</div>
        )}
      </div>

      {/* Campaigns List */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Campaigns</h2>
        {isLoadingCampaigns ? (
          <div className="text-center py-4">Loading campaigns...</div>
        ) : campaigns && campaigns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Objective
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {campaign.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {campaign.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {campaign.status}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {campaign.objective}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            No campaigns found
          </div>
        )}
      </div>
    </div>
  );
}
