import type {
  ReactNode,
} from "react";

import PageContainer from "@/components/layout/page-container";
import PageHeading from "@/components/layout/page-heading";

import {
  cn,
} from "@/lib/utils";

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
        "min-h-screen bg-[#f7f9fb] px-4 py-10 sm:py-14",
        className
      )}
    >
      <PageContainer
        size={width}
      >
        <PageHeading
          title={title}
          description={
            description
          }
          align="center"
          className="mb-5"
        />

        {children}
      </PageContainer>
    </main>
  );
}