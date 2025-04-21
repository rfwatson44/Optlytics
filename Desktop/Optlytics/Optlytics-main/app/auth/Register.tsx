'use client';

import { useState } from 'react';
import { supabase } from './supabaseClient';
import { useRouter } from 'next/navigation';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }
    // Insert profile
    const user = data.user;
    if (user) {
      const { error: profileError } = await supabase.from('profiles').insert([
        {
          id: user.id,
          role,
          approved: role === 'admin' ? false : true,
        },
      ]);
      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }
    }
    setLoading(false);
    router.push('/login');
  }

  function handleBackToLogin() {
    router.push('/auth/login');
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-black">
      <h1 className="text-4xl font-bold mb-8 text-center">Optlytics</h1>
      <form onSubmit={handleRegister} className="w-full max-w-md p-8 bg-white dark:bg-gray-900 rounded-lg shadow space-y-6">
        <h2 className="text-2xl font-bold mb-4 text-center">Register</h2>
        <label className="block mb-2">
          Email
          <input type="email" className="w-full border p-2 rounded mt-1" value={email} onChange={e => setEmail(e.target.value)} required />
        </label>
        <label className="block mb-2">
          Password
          <input type="password" className="w-full border p-2 rounded mt-1" value={password} onChange={e => setPassword(e.target.value)} required />
        </label>
        <label className="block mb-2">
          Role
          <select value={role} onChange={e => setRole(e.target.value as 'user' | 'admin')} className="w-full border p-2 rounded mt-1">
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        {(role === 'user' || role === 'admin') && (
          <div className="text-sm text-yellow-600 mb-2">
            {role === 'user'
              ? 'User accounts require approval before access.'
              : 'Admin accounts require approval before access.'}
          </div>
        )}
        {error && <div className="text-red-600">{error}</div>}
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded" disabled={loading}>
          {loading ? 'Registering...' : 'Register'}
        </button>
        <div className="text-center mt-4">
          <button
            type="button"
            onClick={handleBackToLogin}
            className="text-blue-600 hover:underline"
          >
            Back to Sign In
          </button>
        </div>
      </form>
    <div className="mt-4 text-center">
      <a
        href="/privacy-policy"
        className="text-xs text-gray-400 hover:text-green-700 dark:text-gray-500 dark:hover:text-green-300 transition"
        target="_blank"
        rel="noopener noreferrer"
      >
        Privacy Policy
      </a>
    </div>
  </div>
  );
}
