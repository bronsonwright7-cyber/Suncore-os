import type { listJobEvents } from "@/server/jobs/queries";

type JobEvent = Awaited<ReturnType<typeof listJobEvents>>[number];

export function JobEventsTimeline({ events }: { events: JobEvent[] }) {
  if (events.length === 0) {
    return <p className="text-muted-foreground text-sm">No activity yet.</p>;
  }

  return (
    <ol className="flex flex-col gap-4">
      {events.map((event) => (
        <li key={event.id} className="flex gap-3">
          <div className="mt-1.5 size-2 shrink-0 rounded-full bg-current opacity-40" />
          <div className="flex-1">
            <p className="text-sm">{event.summary}</p>
            <p className="text-muted-foreground text-xs">
              {new Date(event.occurred_at).toLocaleString()}
              {event.actor?.full_name ? ` · ${event.actor.full_name}` : ""}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
