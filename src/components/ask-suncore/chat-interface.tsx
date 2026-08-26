"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { AlertCircle, ArrowUp, Sparkles, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessagePart } from "@/components/ask-suncore/message-parts";
import { FOLLOW_UP_PROMPTS, STARTER_PROMPTS, SuggestedPrompts } from "@/components/ask-suncore/suggested-prompts";
import { cn } from "@/lib/utils";

export function AskSuncoreChat() {
  const { messages, sendMessage, status, error, clearError, regenerate, stop } = useChat({
    transport: new DefaultChatTransport({ api: "/api/ask-suncore" }),
  });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const isBusy = status === "submitted" || status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  function submitPrompt(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;
    clearError();
    sendMessage({ text: trimmed });
    setInput("");
  }

  return (
    <div className="flex h-[calc(100vh-10rem)] min-h-[520px] flex-col overflow-hidden rounded-xl border bg-card">
      <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto p-4 md:p-6">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="bg-primary/10 flex size-12 items-center justify-center rounded-full">
              <Sparkles className="text-primary size-6" />
            </div>
            <div>
              <h2 className="text-foreground text-lg font-semibold">Ask Suncore anything</h2>
              <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-sm">
                Ask about jobs, revenue, crews, customers, or states -- backed by real Suncore
                data, never invented numbers.
              </p>
            </div>
            <SuggestedPrompts prompts={STARTER_PROMPTS} onSelect={submitPrompt} className="max-w-lg" />
          </div>
        ) : (
          messages.map((message, index) => {
            const isLast = index === messages.length - 1;
            return (
              <div
                key={message.id}
                className={cn(
                  "flex flex-col gap-2",
                  message.role === "user" ? "items-end" : "items-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-full space-y-2",
                    message.role === "user" &&
                      "bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-2",
                    message.role === "assistant" && "w-full",
                  )}
                >
                  {message.parts.map((part, partIndex) => (
                    <MessagePart key={partIndex} part={part} />
                  ))}
                </div>
                {isLast && message.role === "assistant" && status === "ready" && (
                  <SuggestedPrompts prompts={FOLLOW_UP_PROMPTS} onSelect={submitPrompt} />
                )}
              </div>
            );
          })
        )}

        {status === "submitted" && (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <span className="flex gap-1">
              <span className="bg-muted-foreground/60 size-1.5 animate-bounce rounded-full [animation-delay:-0.3s]" />
              <span className="bg-muted-foreground/60 size-1.5 animate-bounce rounded-full [animation-delay:-0.15s]" />
              <span className="bg-muted-foreground/60 size-1.5 animate-bounce rounded-full" />
            </span>
            Thinking…
          </div>
        )}

        {error && (
          <div className="border-destructive/30 bg-destructive/10 text-destructive-foreground flex items-start gap-2 rounded-lg border p-3 text-sm">
            <AlertCircle className="text-destructive mt-0.5 size-4 shrink-0" />
            <div className="flex-1 text-foreground">
              <p className="font-medium">Ask Suncore couldn&apos;t finish that answer.</p>
              <p className="text-muted-foreground mt-0.5">{error.message || "Something went wrong."}</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => regenerate()}>
              Retry
            </Button>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitPrompt(input);
        }}
        className="flex items-end gap-2 border-t p-3 md:p-4"
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submitPrompt(input);
            }
          }}
          placeholder="Ask about jobs, revenue, crews, customers…"
          rows={1}
          className="max-h-40 min-h-9 resize-none"
          disabled={isBusy}
        />
        <Button
          type={isBusy ? "button" : "submit"}
          size="icon"
          disabled={!isBusy && !input.trim()}
          onClick={isBusy ? () => stop() : undefined}
          aria-label={isBusy ? "Stop" : "Send"}
        >
          {isBusy ? <Square className="size-4" /> : <ArrowUp className="size-4" />}
        </Button>
      </form>
    </div>
  );
}
