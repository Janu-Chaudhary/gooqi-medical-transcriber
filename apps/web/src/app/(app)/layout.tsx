import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import { CrashRecoveryBanner } from "@/components/recording/CrashRecoveryBanner";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link
            href="/sessions"
            className="text-base font-semibold text-slate-900"
          >
            Gooqi Health Transcriber
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/sessions/new"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              New Session
            </Link>
            <Link
              href="/sessions"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              History
            </Link>
            <SignOutButton />
          </nav>
        </div>
      </header>

      <CrashRecoveryBanner />

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
