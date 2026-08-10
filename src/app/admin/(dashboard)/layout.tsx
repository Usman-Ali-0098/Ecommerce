import { redirect } from "next/navigation";

import { getAdminSession } from "@/lib/admin-auth";

import AdminHeader from "@/components/admin/admin-header";
import AdminSidebar from "@/components/admin/admin-sidebar";

type AdminLayoutProps = {
  children: React.ReactNode;
};

export default async function AdminLayout({
  children,
}: AdminLayoutProps) {
  const admin =
    await getAdminSession();

  if (!admin) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader
        admin={{
          fullName:
            admin.fullName,
          email:
            admin.email,
        }}
      />

      <div className="flex min-h-[calc(100vh-56px)]">
        <AdminSidebar />

        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-5 lg:px-6 lg:py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}