"use client";

import { useActionState } from "react";
import { createCrew, updateCrew, type FormState } from "@/server/crews/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/forms/field-error";
import type { Database } from "@/types/database";

type Crew = Database["public"]["Tables"]["crews"]["Row"];

const initialState: FormState = {};

export function CrewForm({ crew }: { crew?: Crew }) {
  const action = crew ? updateCrew.bind(null, crew.id) : createCrew;
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Crew name</Label>
        <Input id="name" name="name" defaultValue={crew?.name} required />
        <FieldError messages={state.fieldErrors?.name} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={4} defaultValue={crew?.notes ?? ""} />
        <FieldError messages={state.fieldErrors?.notes} />
      </div>
      {state.error ? <p className="text-destructive text-sm">{state.error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : crew ? "Save changes" : "Create crew"}
        </Button>
      </div>
    </form>
  );
}
