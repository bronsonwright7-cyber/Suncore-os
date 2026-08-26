"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, type ForgotPasswordState } from "@/server/auth/actions";
import { FieldError } from "@/components/forms/field-error";
import { cn } from "@/lib/utils";

const initialState: ForgotPasswordState = {};

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(requestPasswordReset, initialState);

  if (state?.status === "success") {
    return (
      <div className="flex flex-col gap-4">
        <p role="status" className="text-foreground text-sm">
          If an account exists for this email address, we&apos;ve sent a password reset link.
        </p>
        <Link href="/sign-in" className="text-sm underline underline-offset-4">
          Back to sign in
        </Link>
      </div>
    );
  }

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
        <FieldError messages={state?.fieldErrors?.email} />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className={cn(
          "bg-primary text-primary-foreground h-10 rounded-md text-sm font-medium",
          "transition-opacity hover:opacity-90 disabled:opacity-50",
        )}
      >
        {isPending ? "Sending..." : "Send reset link"}
      </button>

      <Link
        href="/sign-in"
        className="text-muted-foreground text-center text-sm underline underline-offset-4"
      >
        Back to sign in
      </Link>
    </form>
  );
}
