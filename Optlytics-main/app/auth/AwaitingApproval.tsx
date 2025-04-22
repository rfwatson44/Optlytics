"use client";
import { useAuth } from './AuthContext';

export default function AwaitingApproval() {
  const { profile } = useAuth();
  return (
    <div className="max-w-lg mx-auto mt-24 p-8 bg-yellow-50 border-l-4 border-yellow-400 rounded shadow text-yellow-900">
      <h2 className="text-2xl font-bold mb-2">Awaiting Admin Approval</h2>
      <p>
        {profile && profile.role === 'admin'
          ? 'Your admin account is pending approval. You will receive access once an administrator approves your account in Supabase.'
          : 'You do not have access to this page.'}
      </p>
    </div>
  );
}
