import { z } from "zod";

/**
 * AI Intake extraction schema. This is deliberately NOT the same schema as
 * customerSchema/propertySchema/solarSystemSchema/jobSchema (the various
 * src/server/.../actions.ts files) -- those require fields (uuids,
 * min-length strings) that can't exist yet at extraction time. This schema
 * only describes what the model is allowed to pull out of pasted text;
 * every value here still has to pass the real schemas (via safeParse) in
 * src/server/intake/actions.ts before anything is written, using the
 * user-reviewed/edited values, never the raw extraction directly.
 *
 * Fields prone to conflicting values in pasted text (phone, email) are
 * arrays of every distinct candidate the model found, not a single guess --
 * the review UI makes the user pick (or type) the correct one instead of the
 * model silently choosing.
 *
 * Text fields use "" (not null) as the "not found" sentinel. This isn't a
 * style choice: Anthropic's structured-output endpoint rejects a schema with
 * more than 16 nullable/union-typed parameters ("Schemas contains too many
 * parameters with union types ... limit: 16"), and a straightforward
 * `.nullable()` on every optional field here would blow past that (28, as
 * caught while smoke-testing this schema against the live API). Only
 * genuinely nullable-vs-empty-ambiguous fields (numbers, low-cardinality
 * enums) use `.nullable()` below -- that keeps the union count at 4.
 */

const shortText = z.string().max(300);
const notesText = z.string().max(2000);

export const NAME_MATCH_UNKNOWN = "UNKNOWN" as const;

/**
 * A "pick the best match from this exact list, or UNKNOWN" field -- the same
 * pattern used for job type, partner, and assigned-crew matching below.
 * Never lets the model invent a code/name that isn't one of the options: the
 * enum itself is built from the caller's live, currently-active rows, so an
 * out-of-list answer is a schema violation the API rejects outright, not
 * just a prompt suggestion.
 */
function buildNameMatchField(options: string[], description: string) {
  const allowed: string[] = [...options, NAME_MATCH_UNKNOWN];
  return options.length > 0
    ? z.enum(allowed as [string, ...string[]]).describe(description)
    : z.literal(NAME_MATCH_UNKNOWN);
}

export function buildIntakeExtractionSchema(
  jobTypeCodes: string[],
  partnerNames: string[],
  crewNames: string[],
) {
  const jobTypeCodeField = buildNameMatchField(
    jobTypeCodes,
    "Best-matching job type code from the provided list, or UNKNOWN if none of them fit.",
  );
  const partnerNameField = buildNameMatchField(
    partnerNames,
    "Exact name (from the provided list) of the partner company that referred/sourced this " +
      "job, if the text names one, or UNKNOWN if none is mentioned or it doesn't match any.",
  );
  const assignedCrewNameField = buildNameMatchField(
    crewNames,
    "Exact name (from the provided list) of the crew the text says this job is assigned to, " +
      "or UNKNOWN if none is mentioned or it doesn't match any.",
  );

  return z.object({
    customer: z.object({
      firstName: shortText.describe("Empty string if not found."),
      lastName: shortText.describe("Empty string if not found."),
      phones: z
        .array(z.string().max(50))
        .max(5)
        .describe("Every distinct phone number found in the text, in the format it appears."),
      emails: z
        .array(z.string().max(200))
        .max(5)
        .describe("Every distinct email address found in the text."),
      notes: notesText.describe(
        "Any other customer detail that doesn't fit another field. Empty string if none.",
      ),
    }),
    property: z.object({
      addressLine1: shortText.describe("Street address, e.g. '123 Main St'. Empty if not found."),
      addressLine2: shortText.describe("Unit/suite/apt, if present. Empty string otherwise."),
      city: shortText.describe("Empty string if not found."),
      state: shortText.describe(
        "State/province, abbreviation or full name as written. Empty string if not found.",
      ),
      postalCode: shortText.describe("Empty string if not found."),
      country: shortText.describe("Only if explicitly stated; empty string otherwise."),
      notes: notesText.describe("Empty string if none."),
    }),
    solarSystem: z.object({
      present: z
        .boolean()
        .describe("True only if the text actually describes a solar system (size, panels, etc)."),
      systemSizeKw: z.number().nullable().describe("System size in kW, e.g. 8.4 for '8.4 kW'."),
      panelCount: z.number().int().nullable(),
      panelManufacturer: shortText.describe("Empty string if not found."),
      panelModel: shortText.describe("Empty string if not found."),
      inverterManufacturer: shortText.describe("Empty string if not found."),
      inverterModel: shortText.describe("Empty string if not found."),
      installDate: shortText.describe(
        "ISO date (YYYY-MM-DD) if a specific date is given. Empty string otherwise.",
      ),
      monitoringPlatform: shortText.describe("Empty string if not found."),
      monitoringSystemId: shortText.describe("Empty string if not found."),
      notes: notesText.describe("Empty string if none."),
    }),
    job: z.object({
      title: shortText.describe(
        "A short job title summarizing the requested work. Empty string if there's truly nothing to summarize.",
      ),
      description: notesText.describe(
        "The fuller description of the work requested. Empty string if none.",
      ),
      jobTypeCode: jobTypeCodeField,
      priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).nullable(),
      source: z
        .enum([
          "roofing_partner",
          "solar_company",
          "homeowner",
          "warranty",
          "referral",
          "internal",
          "other",
        ])
        .nullable(),
      partnerName: partnerNameField,
      appointmentDate: shortText.describe(
        "ISO date (YYYY-MM-DD) if a specific date is given. Empty string otherwise.",
      ),
      appointmentStartTime: shortText.describe(
        "24-hour HH:MM if a specific start time is given (e.g. '09:00' for 9am). Empty string otherwise.",
      ),
      appointmentEndTime: shortText.describe(
        "24-hour HH:MM if a specific end time is given (e.g. '11:00' for 11am). Empty string otherwise.",
      ),
      appointmentWindow: shortText.describe("e.g. 'Morning', 'Week of March 3rd'. Empty if none."),
      assignedCrewName: assignedCrewNameField,
      assignedEmployeeNameHint: shortText.describe(
        "Name of a specific technician/lead the text says this job is assigned to (e.g. from " +
          "internal dispatch notes), as written. Empty string if none is mentioned -- this is " +
          "matched against real employees separately, so use the name exactly as it appears, " +
          "don't guess a full name from a partial one.",
      ),
      schedulingNotes: notesText.describe("Empty string if none."),
    }),
    unrecognizedNotes: notesText.describe(
      "Anything else in the pasted text that seems relevant but doesn't fit the fields above. Empty string if nothing is left over.",
    ),
  });
}

export type IntakeExtraction = z.infer<ReturnType<typeof buildIntakeExtractionSchema>>;
