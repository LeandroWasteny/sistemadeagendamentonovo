import { AdminNav } from "@/components/admin/nav";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#ffffff_0%,#f7f9fd_52%,#eefcf5_100%)] text-[#082F8B] md:flex">
      <AdminNav />
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
