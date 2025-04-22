export default function AdminPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <nav className="text-xs text-gray-500 mb-1">
        <span>Home</span> {'>'} <span>Admin</span>
      </nav>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      {/* Add any page-level actions here if needed */}
      <p>Welcome to the admin dashboard. Add your admin features here.</p>
    </div>
  );
}
