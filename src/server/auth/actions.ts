"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
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
