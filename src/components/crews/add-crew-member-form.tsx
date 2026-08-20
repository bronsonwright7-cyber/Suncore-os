"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { addCrewMember, type AddMemberState } from "@/server/crews/actions";
import { searchEmployeesAction } from "@/server/employees/actions";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/forms/combobox";
import { FieldError } from "@/components/forms/field-error";

const initialState: AddMemberState = {};

export function AddCrewMemberForm({ crewId }: { crewId: string }) {
  const action = addCrewMember.bind(null, crewId);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      toast.success("Crew member added");
      formRef.current?.reset();
    }
  }, [state.success]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="employee_id">Employee</Label>
          <Combobox
            name="employee_id"
            placeholder="Select an employee"
            searchPlaceholder="Search employees..."
            emptyText="No active employees found."
            search={searchEmployeesAction}
            required
          />
          <FieldError messages={state.fieldErrors?.employee_id} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="role_in_crew">Role</Label>
          <Select name="role_in_crew" defaultValue="MEMBER">
            <SelectTrigger id="role_in_crew" className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LEAD">Lead</SelectItem>
              <SelectItem value="MEMBER">Member</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="start_date">Start date</Label>
          <Input
            id="start_date"
            name="start_date"
            type="date"
            defaultValue={today}
            className="w-[160px]"
          />
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Adding..." : "Add to crew"}
        </Button>
      </div>
      {state.error ? <p className="text-destructive text-sm">{state.error}</p> : null}
    </form>
  );
}
