import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ContainerSize =
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "full";

type PageContainerProps = {
  children: ReactNode;
  size?: ContainerSize;
  className?: string;
};

const sizeClasses: Record<ContainerSize, string> = {
  sm: "max-w-xl",
  md: "max-w-3xl",
  lg: "max-w-5xl",
  xl: "max-w-7xl",
  full: "max-w-none",
};

export default function PageContainer({
  children,
  size = "xl",
  className,
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        sizeClasses[size],
        className
      )}
    >
      {children}
    </div>
  );
}