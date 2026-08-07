import type { ReactNode } from "react";

type AuthPageProps = {
  title: string;
  children: ReactNode;
};

export default function AuthPage({
  title,
  children,
}: AuthPageProps) {
  return (
    <main className="min-h-screen bg-[#f8f9fa] px-4 py-16 sm:py-24">
      <div className="mx-auto w-full max-w-[760px]">
        <h1 className="mb-12 text-center text-4xl font-normal text-[#087ff5]">
          {title}
        </h1>

        {children}
      </div>
    </main>
  );
}