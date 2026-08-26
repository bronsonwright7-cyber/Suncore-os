"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export interface SignInState {
  error?: string;
}

export async function signInWithPassword(
  _prevState: SignInState | undefined,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Temporary diagnostic logging (server-side only -- never sent to the
    // browser) to identify the real cause of production sign-in failures.
    // Remove once the root cause is confirmed.
    console.error("[signInWithPassword] auth error", {
      message: error.message,
      code: error.code,
      status: error.status,
      name: error.name,
    });
    return { error: "Invalid email or password." };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/sign-in");
}

export interface ForgotPasswordState {
  status?: "success";
  fieldErrors?: Record<string, string[]>;
}

const forgotPasswordSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
});

export async function requestPasswordReset(
  _prevState: ForgotPasswordState | undefined,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") ?? "" });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  // NEXT_PUBLIC_SITE_URL is the documented mechanism for this (see
  // docs/ENVIRONMENT.md); the request's own Origin header is a fallback so
  // this still works correctly if that var is ever unset.
  const headersList = await headers();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ?? headersList.get("origin") ?? "http://localhost:3000";

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/reset-password`,
  });

  if (error) {
    // Server-side only -- never surfaced to the user. Supabase itself does
    // not error for an unknown email (to avoid account-enumeration), so
    // logging this can't leak whether the address exists either.
    console.error("[resetPasswordForEmail] auth error", {
      message: error.message,
      code: error.code,
      status: error.status,
      name: error.name,
    });
  }

  // Always the same response whether or not the email exists, or the call
  // errored -- do not let the UI distinguish "known" from "unknown" emails.
  return { status: "success" };
}

export interface ResetPasswordState {
  status?: "success";
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

// No minimum password length is defined elsewhere in the project (there is
// no signup flow) -- 8 is a reasonable baseline. Supabase's own configured
// policy is still the authoritative check; a stricter client-side minimum
// here never blocks a password Supabase would otherwise accept.
const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function resetPassword(
  _prevState: ResetPasswordState | undefined,
  formData: FormData,
): Promise<ResetPasswordState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password") ?? "",
    confirmPassword: formData.get("confirmPassword") ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  // Relies on the recovery session established client-side (see
  // ResetPasswordForm) via the Supabase browser client, which is shared with
  // this server client through the same auth cookies.
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    console.error("[updateUser] password reset error", {
      message: error.message,
      code: error.code,
      status: error.status,
      name: error.name,
    });
    // Unlike sign-in, the caller already holds a valid recovery session, so
    // showing Supabase's real message here (e.g. a weak-password rejection)
    // doesn't leak anything about account existence.
    return { error: error.message };
  }

  return { status: "success" };
}
