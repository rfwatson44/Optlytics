import Link from "next/link";

export default function HeaderBar({ breadcrumb, title }: { breadcrumb: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex flex-col">
        <nav className="text-xs text-gray-500 mb-1">{breadcrumb}</nav>
        <h1 className="text-2xl font-bold leading-tight">{title}</h1>
      </div>
      {/* The right side (sign out/user) is handled by AuthNav */}
    </div>
  );
}
