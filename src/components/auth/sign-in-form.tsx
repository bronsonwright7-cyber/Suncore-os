"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInWithPassword, type SignInState } from "@/server/auth/actions";
import { cn } from "@/lib/utils";

const initialState: SignInState = {};

export function SignInForm() {
  const [state, formAction, isPending] = useActionState(signInWithPassword, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-foreground text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 rounded-md border px-3 text-sm outline-none focus-visible:ring-2"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-foreground text-sm font-medium">
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-muted-foreground text-sm underline underline-offset-4"
          >
            Forgot password?
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 rounded-md border px-3 text-sm outline-none focus-visible:ring-2"
        />
      </div>

      {state?.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className={cn(
          "bg-primary text-primary-foreground h-10 rounded-md text-sm font-medium",
          "transition-opacity hover:opacity-90 disabled:opacity-50",
        )}
      >
        {isPending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
