/**
 * Single source of truth for the labels of every text + CHECK-constraint
 * category column in the schema (see docs/DATABASE.md). Keep these in sync
 * with the `check (... in (...))` constraints in supabase/migrations.
 */
import type {
  JobPriority,
  JobSource,
  PaymentStatus,
  EmployeeType,
  UserRole,
} from "@/types/database";

export const JOB_PRIORITIES: { value: JobPriority; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

export const JOB_SOURCES: { value: JobSource; label: string }[] = [
  { value: "roofing_partner", label: "Roofing Partner" },
  { value: "solar_company", label: "Solar Company" },
  { value: "homeowner", label: "Homeowner" },
  { value: "warranty", label: "Warranty" },
  { value: "referral", label: "Referral" },
  { value: "internal", label: "Internal" },
  { value: "other", label: "Other" },
];

export const PAYMENT_STATUSES: { value: PaymentStatus; label: string }[] = [
  { value: "NOT_INVOICED", label: "Not Invoiced" },
  { value: "INVOICED", label: "Invoiced" },
  { value: "PARTIALLY_PAID", label: "Partially Paid" },
  { value: "PAID", label: "Paid" },
  { value: "VOID", label: "Void" },
];

export const EMPLOYEE_TYPES: { value: EmployeeType; label: string }[] = [
  { value: "EMPLOYEE", label: "Employee" },
  { value: "CONTRACTOR", label: "Contractor" },
  { value: "SUBCONTRACTOR", label: "Subcontractor" },
];

export const USER_ROLES: { value: UserRole; label: string }[] = [
  { value: "OWNER", label: "Owner" },
  { value: "ADMIN", label: "Admin" },
  { value: "OFFICE", label: "Office" },
  { value: "CREW_LEAD", label: "Crew Lead" },
  { value: "CREW_MEMBER", label: "Crew Member" },
  { value: "QA", label: "QA" },
];

export const JOB_WORKFLOW_STATUSES = [
  "NEW",
  "SCHEDULED",
  "ASSIGNED",
  "CREW_EN_ROUTE",
  "ON_SITE",
  "IN_PROGRESS",
  "COMPLETED",
  "QA",
  "CLOSED",
] as const;
