"use client";

import { useActionState } from "react";
import { createEmployee, updateEmployee, type FormState } from "@/server/employees/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldError } from "@/components/forms/field-error";
import { EMPLOYEE_TYPES } from "@/lib/constants";
import type { Database } from "@/types/database";

type Employee = Database["public"]["Tables"]["employees"]["Row"];

const initialState: FormState = {};

export function EmployeeForm({ employee }: { employee?: Employee }) {
  const action = employee ? updateEmployee.bind(null, employee.id) : createEmployee;
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="first_name">First name</Label>
          <Input id="first_name" name="first_name" defaultValue={employee?.first_name} required />
          <FieldError messages={state.fieldErrors?.first_name} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="last_name">Last name</Label>
          <Input id="last_name" name="last_name" defaultValue={employee?.last_name} required />
          <FieldError messages={state.fieldErrors?.last_name} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="job_title">Job title</Label>
        <Input
          id="job_title"
          name="job_title"
          placeholder="e.g. Lead Electrician"
          defaultValue={employee?.job_title ?? ""}
        />
        <FieldError messages={state.fieldErrors?.job_title} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" defaultValue={employee?.phone ?? ""} />
          <FieldError messages={state.fieldErrors?.phone} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={employee?.email ?? ""} />
          <FieldError messages={state.fieldErrors?.email} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="employee_type">Employee type</Label>
        <Select name="employee_type" defaultValue={employee?.employee_type ?? "EMPLOYEE"}>
          <SelectTrigger id="employee_type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EMPLOYEE_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError messages={state.fieldErrors?.employee_type} />
      </div>

      {state.error ? <p className="text-destructive text-sm">{state.error}</p> : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : employee ? "Save changes" : "Create employee"}
        </Button>
      </div>
    </form>
  );
}
