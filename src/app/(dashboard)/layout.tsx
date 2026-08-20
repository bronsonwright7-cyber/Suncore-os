import { redirect } from "next/navigation";
import { getCurrentUserWithProfile } from "@/server/auth/current-user";
import { Sidebar } from "@/components/nav/sidebar";
import { MobileNav } from "@/components/nav/mobile-nav";
import { UserMenu } from "@/components/nav/user-menu";
import { isCrew } from "@/lib/permissions";
import { signOut } from "@/server/auth/actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentUserWithProfile();

  if (!session) {
    redirect("/sign-in");
  }

  const displayName = session.profile?.full_name ?? session.user.email ?? "User";
  const role = session.profile?.role ?? null;

  // The office/admin dashboard isn't crew's workspace -- send them to their
  // own area (a stub today, the real crew UI in a later phase).
  if (isCrew(role)) {
    redirect("/crew");
  }

  // A brand-new signup has role = null (no access to anything) until an
  // Owner/Admin assigns one -- RLS already enforces this, but show a clear
  // message instead of an empty, confusing dashboard shell.
  if (role === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <h1 className="text-foreground text-lg font-semibold">No access yet</h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          Your account ({session.user.email}) doesn&apos;t have a role assigned yet. Ask an Owner or
          Admin to assign one before you can use Suncore OS.
        </p>
        <form action={signOut}>
          <button type="submit" className="text-sm underline underline-offset-4">
            Sign out
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role={role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-border bg-card flex h-14 shrink-0 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <MobileNav role={role} />
            <span className="font-semibold md:hidden">Suncore OS</span>
          </div>
          <UserMenu displayName={displayName} role={role} />
        </header>
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
