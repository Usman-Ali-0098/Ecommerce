import { redirect } from "next/navigation";

import { getAdminSession } from "@/lib/admin-auth";

import AdminLoginForm from "@/components/admin/admin-login-form";

export default async function AdminLoginPage() {
  /*
   * Only an EXISTING admin session
   * can skip the login page.
   *
   * Normal customer Auth.js session
   * has no effect here.
   */
  const admin =
    await getAdminSession();

  if (admin) {
    redirect(
      "/admin/products"
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <AdminLoginForm />
    </main>
  );
}