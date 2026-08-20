"use client";

import { useActionState } from "react";
import { createCustomer, updateCustomer, type FormState } from "@/server/customers/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/forms/field-error";
import type { Database } from "@/types/database";

type Customer = Database["public"]["Tables"]["customers"]["Row"];

const initialState: FormState = {};

export function CustomerForm({ customer }: { customer?: Customer }) {
  const action = customer ? updateCustomer.bind(null, customer.id) : createCustomer;
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="first_name">First name</Label>
          <Input id="first_name" name="first_name" defaultValue={customer?.first_name} required />
          <FieldError messages={state.fieldErrors?.first_name} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="last_name">Last name</Label>
          <Input id="last_name" name="last_name" defaultValue={customer?.last_name} required />
          <FieldError messages={state.fieldErrors?.last_name} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={customer?.email ?? ""} />
          <FieldError messages={state.fieldErrors?.email} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" defaultValue={customer?.phone ?? ""} />
          <FieldError messages={state.fieldErrors?.phone} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={4} defaultValue={customer?.notes ?? ""} />
        <FieldError messages={state.fieldErrors?.notes} />
      </div>
      {state.error ? <p className="text-destructive text-sm">{state.error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : customer ? "Save changes" : "Create customer"}
        </Button>
      </div>
    </form>
  );
}
