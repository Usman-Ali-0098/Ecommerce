import { redirect } from "next/navigation";

import { auth } from "@/auth";

import SignupForm from "@/components/auth/signup-form";

export default async function SignupPage() {
  /*
   * --------------------------------
   * AUTH CHECK
   * --------------------------------
   *
   * Logged-in users should not be
   * allowed to open signup again.
   */
  const session = await auth();

  if (session?.user?.id) {
    if (session.user.role === "ADMIN") {
      redirect("/admin/products");
    }

    redirect("/");
  }

  return <SignupForm />;
}
