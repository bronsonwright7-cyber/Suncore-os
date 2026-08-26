import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-foreground text-xl font-semibold">Set a new password</h1>
        <p className="text-muted-foreground text-sm">Choose a new password for your account.</p>
      </div>
      <ResetPasswordForm />
    </div>
  );
}
