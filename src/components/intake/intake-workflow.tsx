"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ReviewStep } from "@/components/intake/review-step";
import type { ReviewState } from "@/components/intake/types";
import {
  extractIntakeAction,
  confirmIntakeAction,
  type ExtractIntakeResult,
  type ConfirmIntakeSuccess,
  type ConfirmIntakeFailure,
  type ConfirmIntakeStage,
} from "@/server/intake/actions";

const EXAMPLE_TEXT = `John Smith
123 Main St, Riverside CA
951-555-1234
john@email.com
8.4 kW solar system
20 panels
Remove and reinstall for roof replacement`;

type Step = "paste" | "review" | "result";

const STAGE_LABEL: Record<ConfirmIntakeStage, string> = {
  auth: "Permission",
  customer: "Customer",
  property: "Property",
  solarSystem: "Solar system",
  job: "Job",
};

function reviewStateFromExtraction(result: ExtractIntakeResult): ReviewState {
  const { extraction, jobTypes, partners, crews, matchedEmployee } = result;
  const matchedJobType = jobTypes.find((t) => t.code === extraction.job.jobTypeCode);
  const matchedPartner = partners.find((p) => p.name === extraction.job.partnerName);
  const matchedCrew = crews.find((c) => c.name === extraction.job.assignedCrewName);

  return {
    customerMode: "new",
    existingCustomerId: null,
    existingCustomerLabel: null,

    firstName: extraction.customer.firstName,
    lastName: extraction.customer.lastName,
    phone: extraction.customer.phones.length === 1 ? (extraction.customer.phones[0] ?? "") : "",
    email: extraction.customer.emails.length === 1 ? (extraction.customer.emails[0] ?? "") : "",
    customerNotes: extraction.customer.notes,

    addressLine1: extraction.property.addressLine1,
    addressLine2: extraction.property.addressLine2,
    city: extraction.property.city,
    state: extraction.property.state,
    postalCode: extraction.property.postalCode,
    country: extraction.property.country || "US",
    propertyNotes: extraction.property.notes,

    includeSolarSystem: extraction.solarSystem.present,
    systemSizeKw: extraction.solarSystem.systemSizeKw?.toString() ?? "",
    panelCount: extraction.solarSystem.panelCount?.toString() ?? "",
    panelManufacturer: extraction.solarSystem.panelManufacturer,
    panelModel: extraction.solarSystem.panelModel,
    inverterManufacturer: extraction.solarSystem.inverterManufacturer,
    inverterModel: extraction.solarSystem.inverterModel,
    installDate: extraction.solarSystem.installDate,
    monitoringPlatform: extraction.solarSystem.monitoringPlatform,
    monitoringSystemId: extraction.solarSystem.monitoringSystemId,
    solarNotes: extraction.solarSystem.notes,

    jobTitle: extraction.job.title,
    jobDescription: extraction.job.description,
    jobTypeId: matchedJobType?.id ?? "",
    priority: extraction.job.priority ?? "NORMAL",
    source: extraction.job.source ?? "",
    partnerId: matchedPartner?.id ?? "",
    appointmentDate: extraction.job.appointmentDate,
    appointmentStartTime: extraction.job.appointmentStartTime,
    appointmentEndTime: extraction.job.appointmentEndTime,
    appointmentWindow: extraction.job.appointmentWindow,
    assignedCrewId: matchedCrew?.id ?? "",
    assignedEmployeeId: matchedEmployee?.id ?? "",
    assignedEmployeeLabel: matchedEmployee?.label ?? "",
    schedulingNotes: extraction.job.schedulingNotes,
  };
}

export function IntakeWorkflow() {
  const [step, setStep] = useState<Step>("paste");
  const [pasteText, setPasteText] = useState("");
  const [isExtracting, startExtracting] = useTransition();
  const [extractError, setExtractError] = useState<string | null>(null);

  const [extractResult, setExtractResult] = useState<ExtractIntakeResult | null>(null);
  const [reviewState, setReviewState] = useState<ReviewState | null>(null);

  const [isConfirming, startConfirming] = useTransition();
  const [confirmSuccess, setConfirmSuccess] = useState<ConfirmIntakeSuccess | null>(null);
  const [confirmFailure, setConfirmFailure] = useState<ConfirmIntakeFailure | null>(null);

  function handleExtract() {
    setExtractError(null);
    startExtracting(async () => {
      const result = await extractIntakeAction(pasteText);
      if ("error" in result) {
        setExtractError(result.error);
        return;
      }
      setExtractResult(result.data);
      setReviewState(reviewStateFromExtraction(result.data));
      setStep("review");
    });
  }

  function updateReviewState(patch: Partial<ReviewState>) {
    setReviewState((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  const missingRequired = useMemo(() => {
    if (!reviewState) return [];
    const missing: string[] = [];
    if (reviewState.customerMode === "new") {
      if (!reviewState.firstName.trim()) missing.push("Customer first name");
      if (!reviewState.lastName.trim()) missing.push("Customer last name");
    }
    if (!reviewState.addressLine1.trim()) missing.push("Property address");
    if (!reviewState.city.trim()) missing.push("Property city");
    if (!reviewState.state.trim()) missing.push("Property state");
    if (!reviewState.postalCode.trim()) missing.push("Property ZIP / postal code");
    if (!reviewState.jobTitle.trim()) missing.push("Job title");
    return missing;
  }, [reviewState]);

  const hasUnresolvedConflicts = useMemo(() => {
    if (!reviewState || !extractResult) return false;
    const phoneUnresolved =
      extractResult.extraction.customer.phones.length > 1 && !reviewState.phone.trim();
    const emailUnresolved =
      extractResult.extraction.customer.emails.length > 1 && !reviewState.email.trim();
    return phoneUnresolved || emailUnresolved;
  }, [reviewState, extractResult]);

  const canConfirm = missingRequired.length === 0 && !hasUnresolvedConflicts && !isConfirming;

  function handleConfirm() {
    if (!reviewState) return;
    startConfirming(async () => {
      const result = await confirmIntakeAction({
        customer:
          reviewState.customerMode === "existing" && reviewState.existingCustomerId
            ? { mode: "existing", id: reviewState.existingCustomerId }
            : {
                mode: "new",
                firstName: reviewState.firstName,
                lastName: reviewState.lastName,
                phone: reviewState.phone,
                email: reviewState.email,
                notes: reviewState.customerNotes,
              },
        property: {
          addressLine1: reviewState.addressLine1,
          addressLine2: reviewState.addressLine2,
          city: reviewState.city,
          state: reviewState.state,
          postalCode: reviewState.postalCode,
          country: reviewState.country,
          notes: reviewState.propertyNotes,
        },
        solarSystem: {
          include: reviewState.includeSolarSystem,
          systemSizeKw: reviewState.systemSizeKw,
          panelCount: reviewState.panelCount,
          panelManufacturer: reviewState.panelManufacturer,
          panelModel: reviewState.panelModel,
          inverterManufacturer: reviewState.inverterManufacturer,
          inverterModel: reviewState.inverterModel,
          installDate: reviewState.installDate,
          monitoringPlatform: reviewState.monitoringPlatform,
          monitoringSystemId: reviewState.monitoringSystemId,
          notes: reviewState.solarNotes,
        },
        job: {
          title: reviewState.jobTitle,
          description: reviewState.jobDescription,
          jobTypeId: reviewState.jobTypeId,
          priority: reviewState.priority,
          source: reviewState.source,
          partnerId: reviewState.partnerId,
          appointmentDate: reviewState.appointmentDate,
          appointmentStartTime: reviewState.appointmentStartTime,
          appointmentEndTime: reviewState.appointmentEndTime,
          appointmentWindow: reviewState.appointmentWindow,
          assignedCrewId: reviewState.assignedCrewId,
          assignedEmployeeId: reviewState.assignedEmployeeId,
          schedulingNotes: reviewState.schedulingNotes,
        },
      });
      if (!result.ok) {
        // Atomic: this failure means NOTHING was created (see
        // fn_create_intake_records) -- stay on the review step so the user
        // can fix the flagged section and click Confirm again. There's no
        // partial state to reconcile and no risk of a duplicate retry.
        setConfirmFailure(result);
        toast.error(result.error);
        return;
      }
      setConfirmFailure(null);
      setConfirmSuccess(result);
      setStep("result");
      toast.success("Records created from AI Intake.");
    });
  }

  function handleStartOver() {
    setStep("paste");
    setPasteText("");
    setExtractResult(null);
    setReviewState(null);
    setConfirmSuccess(null);
    setConfirmFailure(null);
    setExtractError(null);
  }

  if (step === "result" && confirmSuccess) {
    return <ResultStep result={confirmSuccess} onStartOver={handleStartOver} />;
  }

  if (step === "review" && reviewState && extractResult) {
    return (
      <div className="flex max-w-3xl flex-col gap-4">
        <ReviewStep
          extraction={extractResult.extraction}
          duplicateCustomers={extractResult.duplicateCustomers}
          jobTypes={extractResult.jobTypes}
          partners={extractResult.partners}
          crews={extractResult.crews}
          state={reviewState}
          onChange={updateReviewState}
          missingRequired={missingRequired}
          hasUnresolvedConflicts={hasUnresolvedConflicts}
        />

        {confirmFailure ? (
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive text-sm">
                Nothing was created -- {STAGE_LABEL[confirmFailure.stage]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{confirmFailure.error}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Fix the {STAGE_LABEL[confirmFailure.stage].toLowerCase()} above and try again --
                this attempt created no records, so retrying is safe.
              </p>
            </CardContent>
          </Card>
        ) : null}

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={handleStartOver} disabled={isConfirming}>
            Start over
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!canConfirm}>
            {isConfirming ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Creating...
              </>
            ) : (
              "Confirm & create"
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Paste client / job information</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Textarea
            rows={10}
            placeholder={EXAMPLE_TEXT}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            className="font-mono text-sm"
          />
          {extractError ? <p className="text-destructive text-sm">{extractError}</p> : null}
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-xs">
              Nothing is created yet -- Suncore AI will extract this into a review screen first.
            </p>
            <Button type="button" onClick={handleExtract} disabled={isExtracting || !pasteText.trim()}>
              {isExtracting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Extracting...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" /> Extract & review
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ResultStep({
  result,
  onStartOver,
}: {
  result: ConfirmIntakeSuccess;
  onStartOver: () => void;
}) {
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="text-primary size-5" />
        <h2 className="text-foreground text-lg font-semibold">Records created</h2>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          <ResultRow
            label="Customer"
            href={`/dashboard/customers/${result.customer.id}`}
            note={result.customer.created ? undefined : "Used existing customer"}
          />
          <ResultRow label="Property" href={`/dashboard/properties/${result.property.id}`} />
          {result.solarSystem ? (
            <ResultRow
              label="Solar system"
              href={`/dashboard/solar-systems/${result.solarSystem.id}`}
            />
          ) : null}
          <ResultRow label="Job" href={`/dashboard/jobs/${result.job.id}`} />
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onStartOver}>
          Start another
        </Button>
        <Button asChild>
          <Link href={`/dashboard/jobs/${result.job.id}`}>View job</Link>
        </Button>
      </div>
    </div>
  );
}

function ResultRow({ label, href, note }: { label: string; href: string; note?: string }) {
  return (
    <div className="border-border flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {note ? <p className="text-muted-foreground text-xs">{note}</p> : null}
      </div>
      <Button asChild variant="link" size="sm">
        <Link href={href}>View</Link>
      </Button>
    </div>
  );
}
