import { redirect } from "next/navigation";

import { auth } from "@/auth";

import LoginForm from "@/components/auth/login-form";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user?.id) {
    redirect(session.user.role === "ADMIN" ? "/admin/products" : "/");
  }

  return <LoginForm />;
}
