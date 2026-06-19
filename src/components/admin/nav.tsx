import { redirect } from "next/navigation";
import { destroySession } from "@/lib/auth/session";
import { AdminNavClient } from "./nav-client";

export function AdminNav() {
  async function logout(_formData: FormData) {
    "use server";
    await destroySession();
    redirect("/admin/login");
  }

  return <AdminNavClient logoutAction={logout} />;
}
