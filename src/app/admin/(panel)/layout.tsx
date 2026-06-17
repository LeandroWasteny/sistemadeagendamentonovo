import { AdminNav } from "@/components/admin/nav";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-screen bg-zinc-100 md:flex">
      <AdminNav />
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}

