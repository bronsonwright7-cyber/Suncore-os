import { anthropic } from "@ai-sdk/anthropic";
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import { getCurrentUserWithProfile } from "@/server/auth/current-user";
import { canReadBroadly } from "@/lib/permissions";
import { suncoreReportingTools } from "@/server/ask-suncore/reporting-tools";
import { suncoreVisualizationTools } from "@/server/ask-suncore/visualization-tools";
import { buildAskSuncoreSystemPrompt } from "@/server/ask-suncore/system-prompt";

/**
 * Streaming chat endpoint for Ask Suncore AI. A Route Handler (not a Server
 * Action) is an intentional, narrow exception to this app's Server-Actions
 * convention -- streaming chat responses require one.
 *
 * Authorization mirrors every other protected route: resolve the signed-in
 * user from the request's own Supabase session cookies (never the
 * service-role key) and check their role with the same permission helper
 * used elsewhere. Every tool this endpoint exposes then reuses that same
 * session-scoped client (see src/server/ask-suncore/reporting-tools.ts), so
 * RLS applies to every row the model ever sees -- this endpoint grants no
 * access beyond what the signed-in user already has.
 */
export async function POST(req: Request) {
  const session = await getCurrentUserWithProfile();
  const role = session?.profile?.role ?? null;

  if (!session || !session.profile?.is_active || !canReadBroadly(role)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: anthropic("claude-opus-5"),
    system: buildAskSuncoreSystemPrompt(session.profile?.full_name ?? null),
    messages: await convertToModelMessages(messages),
    tools: { ...suncoreReportingTools, ...suncoreVisualizationTools },
    stopWhen: stepCountIs(8),
  });

  return result.toUIMessageStreamResponse();
}
