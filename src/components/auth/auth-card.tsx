import type {
  ReactNode,
} from "react";

import {
  cn,
} from "@/lib/utils";

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
        "w-full rounded-lg border border-gray-200 bg-white px-5 py-8 shadow-sm sm:px-6 sm:py-7",
        className
      )}
    >
      {children}
    </section>
  );
}