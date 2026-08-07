import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageHeadingAlign =
  | "left"
  | "center";

type PageHeadingProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  align?: PageHeadingAlign;
  className?: string;
};

export default function PageHeading({
  title,
  description,
  actions,
  align = "left",
  className,
}: PageHeadingProps) {
  return (
    <header
      className={cn(
        "mb-8",
        align === "center"
          ? "text-center"
          : "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div>
        <h1
          className={cn(
            "text-3xl font-medium tracking-tight text-[#087ff5]",
            "sm:text-4xl"
          )}
        >
          {title}
        </h1>

        {description ? (
          <p className="mt-3 max-w-2xl text-base leading-7 text-[#6c757d]">
            {description}
          </p>
        ) : null}
      </div>

      {actions ? (
        <div
          className={cn(
            "flex shrink-0 flex-wrap gap-3",
            align === "center" && "mt-5 justify-center"
          )}
        >
          {actions}
        </div>
      ) : null}
    </header>
  );
}