import {
  Briefcase,
  Handshake,
  HardHat,
  LayoutDashboard,
  Sparkles,
  Sun,
  Users,
  UserSquare2,
  MapPin,
} from "lucide-react";
import type { UserRole } from "@/types/database";
import { canReadBroadly, canViewPartners } from "@/lib/permissions";

export interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  visible?: (role: UserRole | null) => boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/ask", label: "Ask Suncore", icon: Sparkles, visible: canReadBroadly },
  { href: "/dashboard/jobs", label: "Jobs", icon: Briefcase },
  { href: "/dashboard/customers", label: "Customers", icon: Users },
  { href: "/dashboard/properties", label: "Properties", icon: MapPin },
  { href: "/dashboard/solar-systems", label: "Solar Systems", icon: Sun },
  { href: "/dashboard/employees", label: "Employees", icon: UserSquare2 },
  { href: "/dashboard/crews", label: "Crews", icon: HardHat },
  { href: "/dashboard/partners", label: "Partners", icon: Handshake, visible: canViewPartners },
];
