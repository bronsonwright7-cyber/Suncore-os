import type { JobPriority } from "@/types/database";

/**
 * The review step's editable form state. Seeded from the AI extraction
 * result but entirely user-editable -- confirmIntakeAction re-validates
 * every one of these fields through the real Zod schemas regardless of what
 * the model produced, so this shape only has to be convenient for the UI.
 */
export interface ReviewState {
  customerMode: "new" | "existing";
  existingCustomerId: string | null;
  existingCustomerLabel: string | null;

  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  customerNotes: string;

  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  propertyNotes: string;

  includeSolarSystem: boolean;
  systemSizeKw: string;
  panelCount: string;
  panelManufacturer: string;
  panelModel: string;
  inverterManufacturer: string;
  inverterModel: string;
  installDate: string;
  monitoringPlatform: string;
  monitoringSystemId: string;
  solarNotes: string;

  jobTitle: string;
  jobDescription: string;
  jobTypeId: string;
  priority: JobPriority;
  source: string;
  partnerId: string;
  appointmentDate: string;
  appointmentStartTime: string;
  appointmentEndTime: string;
  appointmentWindow: string;
  assignedCrewId: string;
  assignedEmployeeId: string;
  assignedEmployeeLabel: string;
  schedulingNotes: string;
}
