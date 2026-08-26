"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { resetPassword, type ResetPasswordState } from "@/server/auth/actions";
import { FieldError } from "@/components/forms/field-error";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const initialState: ResetPasswordState = {};

type SessionStatus = "checking" | "ready" | "invalid";

const MIN_PASSWORD_LENGTH = 8;

/**
 * This app's Supabase clients always use the PKCE auth flow (see
 * src/lib/supabase/client.ts / server.ts), so the recovery link only
 * resolves to a session in the same browser that requested it (the PKCE
 * code verifier is stored there). Detection happens automatically via the
 * browser client below; if it never completes we show "invalid or expired"
 * rather than leaving the user on a stuck loading state.
 */
// An expired/already-used recovery link comes back with an error in the URL
// instead of a session -- checked once, synchronously, at mount.
function hasRecoveryErrorInUrl() {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(
    window.location.hash ? window.location.hash.slice(1) : window.location.search,
  );
  return Boolean(params.get("error") || params.get("error_code"));
}

export function ResetPasswordForm() {
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>(() =>
    hasRecoveryErrorInUrl() ? "invalid" : "checking",
  );
  const [state, formAction, isPending] = useActionState(resetPassword, initialState);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionStatus("ready");
      }
    });

    // Covers the case where PASSWORD_RECOVERY already fired before this
    // listener was attached.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionStatus("ready");
    });

    const timeout = setTimeout(() => {
      setSessionStatus((current) => (current === "checking" ? "invalid" : current));
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  if (state?.status === "success") {
    return (
      <div className="flex flex-col gap-4">
        <p role="status" className="text-foreground text-sm">
          Your password has been reset.
        </p>
        <Link href="/sign-in" className="text-sm underline underline-offset-4">
          Back to sign in
        </Link>
      </div>
    );
  }

  if (sessionStatus === "checking") {
    return <p className="text-muted-foreground text-sm">Checking your reset link...</p>;
  }

  if (sessionStatus === "invalid") {
    return (
      <div className="flex flex-col gap-4">
        <p role="alert" className="text-destructive text-sm">
          This password reset link is invalid or has expired.
        </p>
        <Link href="/forgot-password" className="text-sm underline underline-offset-4">
          Request a new reset link
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-foreground text-sm font-medium">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 rounded-md border px-3 text-sm outline-none focus-visible:ring-2"
        />
        <FieldError messages={state?.fieldErrors?.password} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirmPassword" className="text-foreground text-sm font-medium">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 rounded-md border px-3 text-sm outline-none focus-visible:ring-2"
        />
        {passwordsMismatch ? (
          <p className="text-destructive text-sm">Passwords do not match</p>
        ) : (
          <FieldError messages={state?.fieldErrors?.confirmPassword} />
        )}
      </div>

      {state?.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending || passwordsMismatch}
        className={cn(
          "bg-primary text-primary-foreground h-10 rounded-md text-sm font-medium",
          "transition-opacity hover:opacity-90 disabled:opacity-50",
        )}
      >
        {isPending ? "Resetting..." : "Reset password"}
      </button>
    </form>
  );
}
