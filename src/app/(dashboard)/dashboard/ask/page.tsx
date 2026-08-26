import { redirect } from "next/navigation";
import { getCurrentUserWithProfile } from "@/server/auth/current-user";
import { canReadBroadly } from "@/lib/permissions";
import { AskSuncoreChat } from "@/components/ask-suncore/chat-interface";

export default async function AskSuncorePage() {
  const session = await getCurrentUserWithProfile();
  const role = session?.profile?.role ?? null;

  // The (dashboard) layout already redirects crew and no-role accounts away,
  // but Ask Suncore's data tools assume broad read access -- check again
  // here so a future role added to this route group can't reach it by
  // accident. Defense-in-depth only: the real boundary is RLS on every
  // query the AI's tools make.
  if (!canReadBroadly(role)) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-foreground text-lg font-semibold">Ask Suncore AI</h1>
        <p className="text-muted-foreground text-sm">
          Ask natural-language questions about your Suncore business data.
        </p>
      </div>
      <AskSuncoreChat />
    </div>
  );
}
