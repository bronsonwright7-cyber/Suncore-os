"use client";

import { LogOut, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { signOut } from "@/server/auth/actions";

interface UserMenuProps {
  displayName: string;
  role: string | null;
}

export function UserMenu({ displayName, role }: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 px-2">
          <span className="bg-muted flex size-7 items-center justify-center rounded-full">
            <User className="size-4" />
          </span>
          <span className="hidden text-left leading-tight sm:block">
            <span className="block text-sm font-medium">{displayName}</span>
            <span className="text-muted-foreground block text-xs">
              {role ?? "No role assigned"}
            </span>
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="sm:hidden">
          <span className="block text-sm font-medium">{displayName}</span>
          <span className="text-muted-foreground block text-xs font-normal">
            {role ?? "No role assigned"}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="sm:hidden" />
        <DropdownMenuItem variant="destructive" onSelect={() => signOut()}>
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
