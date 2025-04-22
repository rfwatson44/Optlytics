import { useAuth } from './AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function RequireAuth({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/login');
      } else if (!profile) {
        // wait for profile to load
      } else if (adminOnly && (profile.role !== 'admin' || !profile.approved)) {
        router.replace('/not-authorized');
      } else if (profile.role === 'admin' && !profile.approved) {
        router.replace('/awaiting-approval');
      }
    }
  }, [user, profile, loading, adminOnly, router]);

  if (loading || !user || !profile) return <div className="text-center mt-12">Loading...</div>;
  if (adminOnly && (profile.role !== 'admin' || !profile.approved)) return null;
  if (profile.role === 'admin' && !profile.approved) return null;
  return <>{children}</>;
}
