import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import Link from "next/link";
import { Suspense } from "react";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col">
      <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
        <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
          <Link href="/" className="font-semibold">
            My App
          </Link>
          <Suspense>
            <AuthButton />
          </Suspense>
        </div>
      </nav>

      <div className="flex-1 w-full max-w-5xl mx-auto p-5">
        {children}
      </div>

      <footer className="w-full flex items-center justify-center border-t py-8">
        <ThemeSwitcher />
      </footer>
    </main>
  );
}
