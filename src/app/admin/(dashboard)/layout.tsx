import { redirect } from "next/navigation";

import { getAdminSession } from "@/lib/admin-auth";

import AdminSidebar from "@/components/admin/admin-sidebar";
import AdminHeader from "@/components/admin/admin-header";

type AdminLayoutProps = {
  children:
    React.ReactNode;
};

export default async function AdminLayout({
  children,
}: AdminLayoutProps) {
  const admin =
    await getAdminSession();

  if (!admin) {
    redirect(
      "/admin/login"
    );
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

      <div className="flex">
        <AdminSidebar />

        <main className="min-w-0 flex-1 p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}