import type { ReactNode } from "react";

import PageContainer from "@/components/layout/page-container";
import PageHeading from "@/components/layout/page-heading";
import { cn } from "@/lib/utils";

type AuthLayoutProps = {
  title: string;
  description?: string;
  children: ReactNode;
  width?: "sm" | "md";
  className?: string;
};

export default function AuthLayout({
  title,
  description,
  children,
  width = "sm",
  className,
}: AuthLayoutProps) {
  return (
    <main
      className={cn(
        "min-h-screen bg-[#f8f9fa] py-14 sm:py-20",
        className
      )}
    >
      <PageContainer size={width}>
        <PageHeading
          title={title}
          description={description}
          align="center"
          className="mb-10"
        />

        {children}
      </PageContainer>
    </main>
  );
}