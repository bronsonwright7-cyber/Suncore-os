import Link from "next/link";
import type { UserRole } from "@/types/database";
import { NavLinks } from "@/components/nav/nav-links";

export function Sidebar({ role }: { role: UserRole | null }) {
  return (
    <aside className="border-border bg-card hidden w-60 shrink-0 flex-col border-r md:flex">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="font-semibold">
          Suncore OS
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <NavLinks role={role} />
      </div>
    </aside>
  );
}
