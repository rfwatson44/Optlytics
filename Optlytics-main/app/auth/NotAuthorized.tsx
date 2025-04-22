export default function NotAuthorized() {
  return (
    <div className="max-w-lg mx-auto mt-24 p-8 bg-red-50 border-l-4 border-red-400 rounded shadow text-red-900">
      <h2 className="text-2xl font-bold mb-2">Not Authorized</h2>
      <p>You do not have permission to view this page.</p>
    </div>
  );
}
