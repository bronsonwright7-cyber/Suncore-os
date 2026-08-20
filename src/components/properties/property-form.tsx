"use client";

import { useActionState } from "react";
import { createProperty, updateProperty, type FormState } from "@/server/properties/actions";
import { searchCustomersAction } from "@/server/customers/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/forms/combobox";
import { FieldError } from "@/components/forms/field-error";
import type { Database } from "@/types/database";

type Property = Database["public"]["Tables"]["properties"]["Row"];

const initialState: FormState = {};

interface PropertyFormProps {
  property?: Property;
  defaultCustomerId?: string;
  defaultCustomerLabel?: string;
}

export function PropertyForm({
  property,
  defaultCustomerId,
  defaultCustomerLabel,
}: PropertyFormProps) {
  const action = property ? updateProperty.bind(null, property.id) : createProperty;
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="customer_id">Customer</Label>
        <Combobox
          name="customer_id"
          defaultValue={property?.customer_id ?? defaultCustomerId}
          defaultLabel={defaultCustomerLabel}
          placeholder="Select a customer"
          searchPlaceholder="Search customers..."
          emptyText="No customers found."
          search={searchCustomersAction}
          required
        />
        <FieldError messages={state.fieldErrors?.customer_id} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="address_line1">Address line 1</Label>
        <Input
          id="address_line1"
          name="address_line1"
          defaultValue={property?.address_line1}
          required
        />
        <FieldError messages={state.fieldErrors?.address_line1} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="address_line2">Address line 2</Label>
        <Input
          id="address_line2"
          name="address_line2"
          defaultValue={property?.address_line2 ?? ""}
        />
        <FieldError messages={state.fieldErrors?.address_line2} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" defaultValue={property?.city} required />
          <FieldError messages={state.fieldErrors?.city} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="state">State</Label>
          <Input id="state" name="state" defaultValue={property?.state} required />
          <FieldError messages={state.fieldErrors?.state} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="postal_code">Postal code</Label>
          <Input
            id="postal_code"
            name="postal_code"
            defaultValue={property?.postal_code}
            required
          />
          <FieldError messages={state.fieldErrors?.postal_code} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="country">Country</Label>
        <Input id="country" name="country" defaultValue={property?.country ?? "US"} required />
        <FieldError messages={state.fieldErrors?.country} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={4} defaultValue={property?.notes ?? ""} />
        <FieldError messages={state.fieldErrors?.notes} />
      </div>

      {state.error ? <p className="text-destructive text-sm">{state.error}</p> : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : property ? "Save changes" : "Create property"}
        </Button>
      </div>
    </form>
  );
}
