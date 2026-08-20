"use client";

import { useActionState } from "react";
import { createPartner, updatePartner, type FormState } from "@/server/partners/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldError } from "@/components/forms/field-error";
import { PARTNER_TYPES } from "@/lib/constants";
import type { Database } from "@/types/database";

type Partner = Database["public"]["Tables"]["partners"]["Row"];

const initialState: FormState = {};

export function PartnerForm({ partner }: { partner?: Partner }) {
  const action = partner ? updatePartner.bind(null, partner.id) : createPartner;
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Company name</Label>
        <Input id="name" name="name" defaultValue={partner?.name} required />
        <FieldError messages={state.fieldErrors?.name} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="partner_type">Partner type</Label>
        <Select name="partner_type" defaultValue={partner?.partner_type ?? "other"}>
          <SelectTrigger id="partner_type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PARTNER_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError messages={state.fieldErrors?.partner_type} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contact_name">Contact name</Label>
        <Input id="contact_name" name="contact_name" defaultValue={partner?.contact_name ?? ""} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contact_phone">Contact phone</Label>
          <Input
            id="contact_phone"
            name="contact_phone"
            type="tel"
            defaultValue={partner?.contact_phone ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contact_email">Contact email</Label>
          <Input
            id="contact_email"
            name="contact_email"
            type="email"
            defaultValue={partner?.contact_email ?? ""}
          />
          <FieldError messages={state.fieldErrors?.contact_email} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={4} defaultValue={partner?.notes ?? ""} />
      </div>

      {state.error ? <p className="text-destructive text-sm">{state.error}</p> : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : partner ? "Save changes" : "Create partner"}
        </Button>
      </div>
    </form>
  );
}
