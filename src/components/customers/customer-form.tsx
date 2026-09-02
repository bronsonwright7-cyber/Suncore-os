"use client";

import { useActionState } from "react";
import { createCustomer, updateCustomer, type FormState } from "@/server/customers/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/forms/field-error";
import { PhoneNumberFields } from "@/components/customers/phone-number-fields";
import type { Database } from "@/types/database";

type Customer = Database["public"]["Tables"]["customers"]["Row"];
type CustomerPhoneNumber = Database["public"]["Tables"]["customer_phone_numbers"]["Row"];

const initialState: FormState = {};

export function CustomerForm({
  customer,
  phoneNumbers = [],
}: {
  customer?: Customer;
  /** Existing phone rows when editing -- omit/empty for a new customer. */
  phoneNumbers?: CustomerPhoneNumber[];
}) {
  const action = customer ? updateCustomer.bind(null, customer.id) : createCustomer;
  const [state, formAction, isPending] = useActionState(action, initialState);

  // Legacy fallback: a customer with no customer_phone_numbers rows yet
  // (e.g. created by AI Intake, which still writes customers.phone directly
  // and doesn't create phone rows) would otherwise show an empty phone
  // editor here, hiding a real existing number -- if the user then added a
  // new number and saved, the old one would be silently overwritten with no
  // trace. Seeding one synthetic primary row from customer.phone keeps it
  // visible and makes saving (with or without further edits) preserve it.
  const initialPhoneRows =
    phoneNumbers.length > 0
      ? phoneNumbers.map((p) => ({
          phoneNumber: p.phone_number,
          phoneType: p.phone_type,
          isPrimary: p.is_primary,
        }))
      : customer?.phone
        ? [{ phoneNumber: customer.phone, phoneType: "mobile" as const, isPrimary: true }]
        : [];

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
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" defaultValue={customer?.email ?? ""} />
        <FieldError messages={state.fieldErrors?.email} />
      </div>
      <PhoneNumberFields initialRows={initialPhoneRows} />
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
