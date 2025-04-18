"use client";

import AccountCard from "./components/AccountCard";

const ACCOUNTS = [
  {
    name: "Mindful",
    accountId: "1114312039331153",
    lastSync: "6 hours ago",
    dataSince: "Sep 4, 2023 synced",
  },
  {
    name: "Zleaguegg",
    accountId: "604977370158225",
    lastSync: "6 hours ago",
    dataSince: "Jan 1, 2024 synced",
  },
];

import React from "react";



export default function Home() {
  return (
    <div className="w-full max-w-5xl mx-auto px-8 py-10">
      <h1 className="text-2xl font-bold mb-8">Home</h1>
      <div className="space-y-4">
        {ACCOUNTS.map((account) => (
          <AccountCard
            key={account.accountId}
            name={account.name}
            accountId={account.accountId}
            lastSync={account.lastSync}
            dataSince={account.dataSince}
          />
        ))}
      </div>
    </div>
  );
}
