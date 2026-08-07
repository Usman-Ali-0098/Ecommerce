import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AuthCardProps = {
  children: ReactNode;
  className?: string;
};

export default function AuthCard({
  children,
  className,
}: AuthCardProps) {
  return (
    <section
      className={cn(
        "w-full rounded-md border border-[#dee2e6] bg-white",
        "px-6 py-8 sm:px-8 sm:py-10",
        className
      )}
    >
      {children}
    </section>
  );
}