"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/forms/combobox";
import { ConflictField } from "@/components/intake/conflict-field";
import { JOB_PRIORITIES, JOB_SOURCES } from "@/lib/constants";
import { searchEmployeesAction } from "@/server/employees/actions";
import type { DuplicateCustomerMatch } from "@/server/customers/queries";
import type { IntakeExtraction } from "@/server/intake/schema";
import type { ReviewState } from "@/components/intake/types";
import type { JobPriority } from "@/types/database";

interface ReviewStepProps {
  extraction: IntakeExtraction;
  duplicateCustomers: DuplicateCustomerMatch[];
  jobTypes: { id: string; code: string; label: string }[];
  partners: { id: string; name: string }[];
  crews: { id: string; name: string }[];
  state: ReviewState;
  onChange: (patch: Partial<ReviewState>) => void;
  missingRequired: string[];
  hasUnresolvedConflicts: boolean;
}

/** Sources where the manual Job form also shows a Partner picker -- see job-form.tsx. */
const PARTNER_SOURCES = new Set(["roofing_partner", "solar_company"]);

const MATCH_REASON_LABEL: Record<string, string> = {
  name: "name",
  phone: "phone",
  email: "email",
};

export function ReviewStep({
  extraction,
  duplicateCustomers,
  jobTypes,
  partners,
  crews,
  state,
  onChange,
  missingRequired,
  hasUnresolvedConflicts,
}: ReviewStepProps) {
  return (
    <div className="flex flex-col gap-6">
      {extraction.unrecognizedNotes ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-sm">Unrecognized text</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm whitespace-pre-wrap">
              {extraction.unrecognizedNotes}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {(missingRequired.length > 0 || hasUnresolvedConflicts) && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive text-sm">
              Needs attention before you can create these records
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            {missingRequired.length > 0 ? (
              <div>
                <p className="font-medium">Missing:</p>
                <ul className="text-muted-foreground list-inside list-disc">
                  {missingRequired.map((field) => (
                    <li key={field}>{field}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {hasUnresolvedConflicts ? (
              <p className="text-muted-foreground">
                Resolve the conflicting values flagged below before continuing.
              </p>
            ) : null}
          </CardContent>
        </Card>
      )}

      {duplicateCustomers.length > 0 && state.customerMode === "new" ? (
        <Card className="border-amber-500/50">
          <CardHeader>
            <CardTitle className="text-sm">Possible duplicate customer</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-muted-foreground text-sm">
              These existing customers look like they might be the same person. Choose one to
              avoid creating a duplicate, or continue creating a new customer below.
            </p>
            {duplicateCustomers.map((match) => (
              <div
                key={match.id}
                className="border-border flex items-center justify-between rounded-md border p-2"
              >
                <div className="text-sm">
                  <p className="font-medium">
                    {match.first_name} {match.last_name}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {[match.email, match.phone].filter(Boolean).join(" · ") || "No contact info"}
                  </p>
                  <div className="mt-1 flex gap-1">
                    {match.matchReasons.map((reason) => (
                      <Badge key={reason} variant="outline">
                        matched by {MATCH_REASON_LABEL[reason] ?? reason}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    onChange({
                      customerMode: "existing",
                      existingCustomerId: match.id,
                      existingCustomerLabel: `${match.first_name} ${match.last_name}`,
                    })
                  }
                >
                  Use this customer
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customer</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {state.customerMode === "existing" ? (
            <div className="border-border bg-muted/30 flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Using existing customer</p>
                <p className="text-muted-foreground text-sm">{state.existingCustomerLabel}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  onChange({
                    customerMode: "new",
                    existingCustomerId: null,
                    existingCustomerLabel: null,
                  })
                }
              >
                Create new customer instead
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="firstName">First name</Label>
                    {!state.firstName.trim() ? <Badge variant="destructive">Required</Badge> : null}
                  </div>
                  <Input
                    id="firstName"
                    value={state.firstName}
                    onChange={(e) => onChange({ firstName: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="lastName">Last name</Label>
                    {!state.lastName.trim() ? <Badge variant="destructive">Required</Badge> : null}
                  </div>
                  <Input
                    id="lastName"
                    value={state.lastName}
                    onChange={(e) => onChange({ lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ConflictField
                  id="phone"
                  label="Phone"
                  candidates={extraction.customer.phones}
                  value={state.phone}
                  onChange={(phone) => onChange({ phone })}
                />
                <ConflictField
                  id="email"
                  label="Email"
                  candidates={extraction.customer.emails}
                  value={state.email}
                  onChange={(email) => onChange({ email })}
                  type="email"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="customerNotes">Customer notes</Label>
                <Textarea
                  id="customerNotes"
                  rows={2}
                  value={state.customerNotes}
                  onChange={(e) => onChange({ customerNotes: e.target.value })}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Property</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Label htmlFor="addressLine1">Address</Label>
              {!state.addressLine1.trim() ? <Badge variant="destructive">Required</Badge> : null}
            </div>
            <Input
              id="addressLine1"
              value={state.addressLine1}
              onChange={(e) => onChange({ addressLine1: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="addressLine2">Address line 2</Label>
            <Input
              id="addressLine2"
              value={state.addressLine2}
              onChange={(e) => onChange({ addressLine2: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Label htmlFor="city">City</Label>
                {!state.city.trim() ? <Badge variant="destructive">Required</Badge> : null}
              </div>
              <Input id="city" value={state.city} onChange={(e) => onChange({ city: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Label htmlFor="propState">State</Label>
                {!state.state.trim() ? <Badge variant="destructive">Required</Badge> : null}
              </div>
              <Input
                id="propState"
                value={state.state}
                onChange={(e) => onChange({ state: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Label htmlFor="postalCode">ZIP / Postal code</Label>
                {!state.postalCode.trim() ? <Badge variant="destructive">Required</Badge> : null}
              </div>
              <Input
                id="postalCode"
                value={state.postalCode}
                onChange={(e) => onChange({ postalCode: e.target.value })}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={state.country}
              onChange={(e) => onChange({ country: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="propertyNotes">Property notes</Label>
            <Textarea
              id="propertyNotes"
              rows={2}
              value={state.propertyNotes}
              onChange={(e) => onChange({ propertyNotes: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Solar system</CardTitle>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={state.includeSolarSystem}
              onChange={(e) => onChange({ includeSolarSystem: e.target.checked })}
              className="accent-primary"
            />
            Include
          </label>
        </CardHeader>
        {state.includeSolarSystem ? (
          <CardContent className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="systemSizeKw">System size (kW)</Label>
                <Input
                  id="systemSizeKw"
                  value={state.systemSizeKw}
                  onChange={(e) => onChange({ systemSizeKw: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="panelCount">Panel count</Label>
                <Input
                  id="panelCount"
                  value={state.panelCount}
                  onChange={(e) => onChange({ panelCount: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="panelManufacturer">Panel manufacturer</Label>
                <Input
                  id="panelManufacturer"
                  value={state.panelManufacturer}
                  onChange={(e) => onChange({ panelManufacturer: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="panelModel">Panel model</Label>
                <Input
                  id="panelModel"
                  value={state.panelModel}
                  onChange={(e) => onChange({ panelModel: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="inverterManufacturer">Inverter manufacturer</Label>
                <Input
                  id="inverterManufacturer"
                  value={state.inverterManufacturer}
                  onChange={(e) => onChange({ inverterManufacturer: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="inverterModel">Inverter model</Label>
                <Input
                  id="inverterModel"
                  value={state.inverterModel}
                  onChange={(e) => onChange({ inverterModel: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="installDate">Install date</Label>
                <Input
                  id="installDate"
                  type="date"
                  value={state.installDate}
                  onChange={(e) => onChange({ installDate: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="monitoringPlatform">Monitoring platform</Label>
                <Input
                  id="monitoringPlatform"
                  value={state.monitoringPlatform}
                  onChange={(e) => onChange({ monitoringPlatform: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="monitoringSystemId">Monitoring system ID</Label>
                <Input
                  id="monitoringSystemId"
                  value={state.monitoringSystemId}
                  onChange={(e) => onChange({ monitoringSystemId: e.target.value })}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="solarNotes">Solar system notes</Label>
              <Textarea
                id="solarNotes"
                rows={2}
                value={state.solarNotes}
                onChange={(e) => onChange({ solarNotes: e.target.value })}
              />
            </div>
          </CardContent>
        ) : (
          <CardContent>
            <p className="text-muted-foreground text-sm">
              {extraction.solarSystem.present
                ? "AI Intake found solar system details but it's excluded from creation -- check Include to add it."
                : "No solar system details were found in the pasted text."}
            </p>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Job</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Label htmlFor="jobTitle">Title</Label>
              {!state.jobTitle.trim() ? <Badge variant="destructive">Required</Badge> : null}
            </div>
            <Input
              id="jobTitle"
              value={state.jobTitle}
              onChange={(e) => onChange({ jobTitle: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="jobDescription">Description</Label>
            <Textarea
              id="jobDescription"
              rows={3}
              value={state.jobDescription}
              onChange={(e) => onChange({ jobDescription: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="jobTypeId">Job type</Label>
              <Select
                value={state.jobTypeId || undefined}
                onValueChange={(jobTypeId) => onChange({ jobTypeId })}
              >
                <SelectTrigger id="jobTypeId" className="w-full">
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
              {extraction.job.jobTypeCode === "UNKNOWN" ? (
                <p className="text-muted-foreground text-xs">
                  AI Intake couldn&apos;t match a job type -- pick one manually.
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={state.priority}
                onValueChange={(priority) => onChange({ priority: priority as JobPriority })}
              >
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
              <Select
                value={state.source}
                onValueChange={(source) =>
                  // Switching to a source that doesn't support a partner must
                  // clear partnerId, not just hide the Partner field below --
                  // otherwise a previously-selected partner stays in review
                  // state (invisible to the user) and still gets sent to
                  // confirmIntakeAction. Switching between two
                  // partner-supporting sources leaves partnerId untouched.
                  onChange(PARTNER_SOURCES.has(source) ? { source } : { source, partnerId: "" })
                }
              >
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
            {PARTNER_SOURCES.has(state.source) ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="partnerId">Partner</Label>
                <Select
                  value={state.partnerId || undefined}
                  onValueChange={(partnerId) => onChange({ partnerId })}
                >
                  <SelectTrigger id="partnerId" className="w-full">
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
                {extraction.job.partnerName === "UNKNOWN" ? (
                  <p className="text-muted-foreground text-xs">
                    AI Intake couldn&apos;t match a partner -- pick one manually if applicable.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="appointmentDate">Appointment date</Label>
              <Input
                id="appointmentDate"
                type="date"
                value={state.appointmentDate}
                onChange={(e) => onChange({ appointmentDate: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="appointmentStartTime">Start time</Label>
              <Input
                id="appointmentStartTime"
                type="time"
                value={state.appointmentStartTime}
                onChange={(e) => onChange({ appointmentStartTime: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="appointmentEndTime">End time</Label>
              <Input
                id="appointmentEndTime"
                type="time"
                value={state.appointmentEndTime}
                onChange={(e) => onChange({ appointmentEndTime: e.target.value })}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="appointmentWindow">Appointment window</Label>
            <Input
              id="appointmentWindow"
              placeholder="e.g. Morning (8am-12pm) -- for when an exact time isn't set"
              value={state.appointmentWindow}
              onChange={(e) => onChange({ appointmentWindow: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="assignedCrewId">Assigned crew</Label>
              <Select
                value={state.assignedCrewId || undefined}
                onValueChange={(assignedCrewId) => onChange({ assignedCrewId })}
              >
                <SelectTrigger id="assignedCrewId" className="w-full">
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
              {extraction.job.assignedCrewName === "UNKNOWN" ? (
                <p className="text-muted-foreground text-xs">
                  AI Intake couldn&apos;t match a crew -- pick one manually if applicable.
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Assigned lead/tech</Label>
              <Combobox
                name="assignedEmployeeId"
                defaultValue={state.assignedEmployeeId}
                defaultLabel={state.assignedEmployeeLabel}
                placeholder="Unassigned"
                searchPlaceholder="Search employees..."
                emptyText="No active employees found."
                search={searchEmployeesAction}
                onSelect={(option) =>
                  onChange({
                    assignedEmployeeId: option?.value ?? "",
                    assignedEmployeeLabel: option?.label ?? "",
                  })
                }
              />
              {extraction.job.assignedEmployeeNameHint && !state.assignedEmployeeId ? (
                <p className="text-muted-foreground text-xs">
                  Pasted text mentioned &quot;{extraction.job.assignedEmployeeNameHint}&quot; --
                  no matching active employee found. Search to assign manually if applicable.
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="schedulingNotes">Scheduling notes</Label>
            <Textarea
              id="schedulingNotes"
              rows={2}
              value={state.schedulingNotes}
              onChange={(e) => onChange({ schedulingNotes: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
