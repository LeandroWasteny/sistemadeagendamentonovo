import { AdminNav } from "@/components/admin/nav";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden text-[var(--app-text)] [background:var(--app-bg)] md:flex">
      <AdminNav />
      <main className="min-w-0 flex-1 p-4 md:p-6 xl:p-8">{children}</main>
    </div>
  );
}
