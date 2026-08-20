import { redirect } from "next/navigation";
import { getCurrentUserWithProfile } from "@/server/auth/current-user";
import { signOut } from "@/server/auth/actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentUserWithProfile();

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen">
      <header className="border-border flex items-center justify-between border-b px-6 py-4">
        <div>
          <p className="text-foreground text-sm font-semibold">Suncore OS</p>
          <p className="text-muted-foreground text-xs">
            {session.profile?.full_name ?? session.user.email} &middot;{" "}
            {session.profile?.role ?? "No role assigned"}
          </p>
        </div>
        <form action={signOut}>
          <button type="submit" className="text-muted-foreground hover:text-foreground text-sm">
            Sign out
          </button>
        </form>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
