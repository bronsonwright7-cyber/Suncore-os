"use client";

import { useActionState, useState } from "react";
import { createJob, updateJob, type FormState } from "@/server/jobs/actions";
import { searchCustomersAction } from "@/server/customers/actions";
import { searchPropertiesAction } from "@/server/properties/actions";
import { searchSolarSystemsAction } from "@/server/solar-systems/actions";
import { searchEmployeesAction } from "@/server/employees/actions";
import type { getJob } from "@/server/jobs/queries";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/forms/combobox";
import { FieldError } from "@/components/forms/field-error";
import { JOB_PRIORITIES, JOB_SOURCES } from "@/lib/constants";

type Job = NonNullable<Awaited<ReturnType<typeof getJob>>>;

interface JobFormProps {
  job?: Job;
  jobTypes: { id: string; label: string }[];
  partners: { id: string; name: string }[];
  crews: { id: string; name: string }[];
  defaultCustomerId?: string;
  defaultCustomerLabel?: string;
  defaultPropertyId?: string;
  defaultPropertyLabel?: string;
}

const initialState: FormState = {};
const PARTNER_SOURCES = new Set(["roofing_partner", "solar_company"]);

export function JobForm({
  job,
  jobTypes,
  partners,
  crews,
  defaultCustomerId,
  defaultCustomerLabel,
  defaultPropertyId,
  defaultPropertyLabel,
}: JobFormProps) {
  const action = job ? updateJob.bind(null, job.id) : createJob;
  const [state, formAction, isPending] = useActionState(action, initialState);

  const [customerId, setCustomerId] = useState(
    job?.property?.customer?.id ?? defaultCustomerId ?? "",
  );
  const [propertyId, setPropertyId] = useState(job?.property_id ?? defaultPropertyId ?? "");
  const [source, setSource] = useState(job?.source ?? "");

  return (
    <form action={formAction} className="flex max-w-3xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customer &amp; Property</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Customer</Label>
            <Combobox
              name="_customer_id"
              defaultValue={customerId}
              defaultLabel={
                defaultCustomerLabel ??
                (job?.property?.customer
                  ? `${job.property.customer.first_name} ${job.property.customer.last_name}`
                  : undefined)
              }
              placeholder="Select a customer"
              searchPlaceholder="Search customers..."
              emptyText="No customers found."
              search={searchCustomersAction}
              onSelect={(option) => {
                setCustomerId(option?.value ?? "");
                setPropertyId("");
              }}
            />
            <p className="text-muted-foreground text-xs">
              Used to find the property below -- not saved directly on the job.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Property</Label>
            <Combobox
              key={customerId}
              name="property_id"
              defaultValue={propertyId}
              defaultLabel={defaultPropertyLabel ?? job?.property?.address_line1 ?? undefined}
              placeholder={customerId ? "Select a property" : "Select a customer first"}
              searchPlaceholder="Search properties..."
              emptyText="No properties found."
              search={(q) => searchPropertiesAction(q, customerId || undefined)}
              onSelect={(option) => setPropertyId(option?.value ?? "")}
              disabled={!customerId}
              required
            />
            <FieldError messages={state.fieldErrors?.property_id} />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Solar system (optional)</Label>
            <Combobox
              key={propertyId}
              name="solar_system_id"
              defaultValue={job?.solar_system_id ?? undefined}
              defaultLabel={
                job?.solar_system?.system_size_kw
                  ? `${job.solar_system.system_size_kw} kW`
                  : undefined
              }
              placeholder={propertyId ? "Select a solar system" : "Select a property first"}
              searchPlaceholder="Search solar systems..."
              emptyText="No solar systems on this property."
              search={(q) => searchSolarSystemsAction(propertyId || undefined, q)}
              disabled={!propertyId}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Job Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="e.g. Inverter replacement"
              defaultValue={job?.title}
              required
            />
            <FieldError messages={state.fieldErrors?.title} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={job?.description ?? ""}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="job_type_id">Job type</Label>
              <Select name="job_type_id" defaultValue={job?.job_type_id ?? undefined}>
                <SelectTrigger id="job_type_id" className="w-full">
                  <SelectValue placeholder="Select a job type" />
                </SelectTrigger>
                <SelectContent>
                  {jobTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="priority">Priority</Label>
              <Select name="priority" defaultValue={job?.priority ?? "NORMAL"}>
                <SelectTrigger id="priority" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JOB_PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="source">Source</Label>
              <Select name="source" value={source} onValueChange={setSource}>
                <SelectTrigger id="source" className="w-full">
                  <SelectValue placeholder="Where did this job come from?" />
                </SelectTrigger>
                <SelectContent>
                  {JOB_SOURCES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {PARTNER_SOURCES.has(source) ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="partner_id">Partner</Label>
                <Select name="partner_id" defaultValue={job?.partner_id ?? undefined}>
                  <SelectTrigger id="partner_id" className="w-full">
                    <SelectValue placeholder="Select a partner" />
                  </SelectTrigger>
                  <SelectContent>
                    {partners.map((partner) => (
                      <SelectItem key={partner.id} value={partner.id}>
                        {partner.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scheduling &amp; Assignment</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="appointment_date">Date</Label>
              <Input
                id="appointment_date"
                name="appointment_date"
                type="date"
                defaultValue={job?.appointment_date ?? ""}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="appointment_start_time">Start time</Label>
              <Input
                id="appointment_start_time"
                name="appointment_start_time"
                type="time"
                defaultValue={job?.appointment_start_time ?? ""}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="appointment_end_time">End time</Label>
              <Input
                id="appointment_end_time"
                name="appointment_end_time"
                type="time"
                defaultValue={job?.appointment_end_time ?? ""}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="appointment_window">Appointment window</Label>
            <Input
              id="appointment_window"
              name="appointment_window"
              placeholder="e.g. Morning (8am-12pm) -- for when an exact time isn't set"
              defaultValue={job?.appointment_window ?? ""}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="assigned_crew_id">Assigned crew</Label>
              <Select name="assigned_crew_id" defaultValue={job?.assigned_crew_id ?? undefined}>
                <SelectTrigger id="assigned_crew_id" className="w-full">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  {crews.map((crew) => (
                    <SelectItem key={crew.id} value={crew.id}>
                      {crew.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Assigned lead/tech</Label>
              <Combobox
                name="assigned_employee_id"
                defaultValue={job?.assigned_employee_id ?? undefined}
                defaultLabel={
                  job?.assigned_employee
                    ? `${job.assigned_employee.first_name} ${job.assigned_employee.last_name}`
                    : undefined
                }
                placeholder="Unassigned"
                searchPlaceholder="Search employees..."
                emptyText="No active employees found."
                search={searchEmployeesAction}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="scheduling_notes">Internal scheduling notes</Label>
            <Textarea
              id="scheduling_notes"
              name="scheduling_notes"
              rows={3}
              placeholder="Never shown to the customer or crew"
              defaultValue={job?.scheduling_notes ?? ""}
            />
          </div>
        </CardContent>
      </Card>

      {state.error ? <p className="text-destructive text-sm">{state.error}</p> : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : job ? "Save changes" : "Create job"}
        </Button>
      </div>
    </form>
  );
}
