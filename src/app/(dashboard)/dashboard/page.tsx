import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NAV_ITEMS } from "@/components/nav/nav-items";
import { getCurrentUserWithProfile } from "@/server/auth/current-user";

export default async function DashboardPage() {
  const session = await getCurrentUserWithProfile();
  const role = session?.profile?.role ?? null;
  const sections = NAV_ITEMS.filter((item) => item.href !== "/dashboard").filter(
    (item) => item.visible?.(role) ?? true,
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-foreground text-lg font-semibold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Operations command center metrics (jobs today, overdue, crews at risk...) arrive in a
          later phase. For now, jump into a section below.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="hover:border-primary/50 transition-colors">
                <CardHeader className="flex-row items-center gap-3 space-y-0">
                  <Icon className="text-muted-foreground size-5" />
                  <div>
                    <CardTitle className="text-base">{item.label}</CardTitle>
                    <CardDescription>Manage {item.label.toLowerCase()}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
