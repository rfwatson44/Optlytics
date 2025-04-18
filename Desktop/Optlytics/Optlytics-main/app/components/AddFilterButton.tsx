import React from "react";

export default function AddFilterButton() {
  return (
    <button
      className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
      type="button"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
      Add filter
    </button>
  );
}
