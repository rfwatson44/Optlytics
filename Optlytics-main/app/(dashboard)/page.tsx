"use client";

import AccountCard from "../components/AccountCard";
import React from "react";
import RequireAuth from '../auth/RequireAuth';

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

import { useHeader } from "../components/HeaderContext";

export default function Home() {
  const { setHeader } = useHeader();
  React.useEffect(() => {
    setHeader(<span>Home</span>, "Home");
  }, [setHeader]);

  return (
    <RequireAuth>
      <div className="w-full max-w-5xl mx-auto px-8 py-10">
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
    </RequireAuth>
  );
}
