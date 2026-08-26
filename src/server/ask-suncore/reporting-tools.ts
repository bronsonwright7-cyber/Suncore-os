import { z } from "zod";
import { tool } from "ai";
import { createClient } from "@/lib/supabase/server";

/**
 * Ask Suncore AI data tools -- one per reporting function from
 * supabase/migrations/0016_reporting_functions.sql. Deliberately NOT a
 * generic database/SQL tool: each tool calls exactly one fixed, parameterized
 * RPC.
 *
 * Each call goes through `createClient()`, the same cookie-scoped Supabase
 * client used by every Server Action in this app -- it runs under the
 * signed-in user's session, so PostgREST resolves `auth.uid()` to that user
 * and RLS applies exactly as it would to any other query. The service-role
 * key is never used here. The RPC'd functions are all SECURITY INVOKER (see
 * the migration file), so they can't see or return anything the calling
 * user's own role couldn't already see via the table policies.
 */

const dateRangeShape = {
  dateFrom: z
    .string()
    .optional()
    .describe("ISO date (YYYY-MM-DD), inclusive lower bound. Omit for no lower bound."),
  dateTo: z
    .string()
    .optional()
    .describe("ISO date (YYYY-MM-DD), inclusive upper bound. Omit for no upper bound."),
};

export const suncoreReportingTools = {
  getJobStatusCounts: tool({
    description:
      "Current count of jobs grouped by status (NEW, SCHEDULED, ASSIGNED, CREW_EN_ROUTE, " +
      "ON_SITE, IN_PROGRESS, COMPLETED, QA, CLOSED), optionally scoped to a job-creation date " +
      "range. Use for 'how many jobs are open/in progress/closed' style questions.",
    inputSchema: z.object(dateRangeShape),
    execute: async ({ dateFrom, dateTo }) => {
      const supabase = await createClient();
      const { data, error } = await supabase.rpc("fn_report_job_status_counts", {
        p_date_from: dateFrom ?? null,
        p_date_to: dateTo ?? null,
      });
      if (error) throw new Error(error.message);
      return data;
    },
  }),

  getJobsCompletedByMonth: tool({
    description:
      "Monthly count of jobs that reached a given terminal status (default CLOSED), based on " +
      "each job's most recent transition into that status. Use for 'how many jobs did we " +
      "complete each month' / 'jobs completed this year' style questions.",
    inputSchema: z.object({
      status: z
        .enum(["COMPLETED", "QA", "CLOSED"])
        .optional()
        .describe("Status to count transitions into. Defaults to CLOSED (fully done jobs)."),
      monthsBack: z
        .number()
        .int()
        .min(1)
        .max(36)
        .optional()
        .describe("How many months back from the current month to include. Default 12."),
    }),
    execute: async ({ status, monthsBack }) => {
      const supabase = await createClient();
      const { data, error } = await supabase.rpc("fn_report_jobs_completed_by_month", {
        p_status: status ?? "CLOSED",
        p_months_back: monthsBack ?? 12,
      });
      if (error) throw new Error(error.message);
      return data;
    },
  }),

  getRevenueByMonth: tool({
    description:
      "Approximate monthly revenue for jobs closed in each month (derived from each job's " +
      "invoice/approved/estimated amount, whichever is most concrete -- there is no invoicing " +
      "ledger yet, so treat this as an approximation and say so). Use for 'sales'/'revenue' " +
      "by month questions.",
    inputSchema: z.object({
      monthsBack: z
        .number()
        .int()
        .min(1)
        .max(36)
        .optional()
        .describe("How many months back from the current month to include. Default 12."),
    }),
    execute: async ({ monthsBack }) => {
      const supabase = await createClient();
      const { data, error } = await supabase.rpc("fn_report_revenue_by_month", {
        p_months_back: monthsBack ?? 12,
      });
      if (error) throw new Error(error.message);
      return data;
    },
  }),

  getCrewCompletions: tool({
    description:
      "Number of jobs each crew closed within an optional date range (by the job's most " +
      "recent transition to CLOSED), ranked highest first. Use for 'which crew completed the " +
      "most jobs' style questions.",
    inputSchema: z.object(dateRangeShape),
    execute: async ({ dateFrom, dateTo }) => {
      const supabase = await createClient();
      const { data, error } = await supabase.rpc("fn_report_crew_completions", {
        p_date_from: dateFrom ?? null,
        p_date_to: dateTo ?? null,
      });
      if (error) throw new Error(error.message);
      return data;
    },
  }),

  getCustomersAddedByMonth: tool({
    description:
      "Monthly count of new customers added. Use for 'how many customers did we add each " +
      "month' style questions.",
    inputSchema: z.object({
      monthsBack: z
        .number()
        .int()
        .min(1)
        .max(36)
        .optional()
        .describe("How many months back from the current month to include. Default 12."),
    }),
    execute: async ({ monthsBack }) => {
      const supabase = await createClient();
      const { data, error } = await supabase.rpc("fn_report_customers_added_by_month", {
        p_months_back: monthsBack ?? 12,
      });
      if (error) throw new Error(error.message);
      return data;
    },
  }),

  getJobsByState: tool({
    description:
      "Job count and approximate revenue grouped by the property's US state, optionally " +
      "scoped to a job-creation date range and/or a specific set of states. Use for 'jobs by " +
      "state' / 'compare CA and TX' style questions.",
    inputSchema: z.object({
      ...dateRangeShape,
      states: z
        .array(z.string().length(2))
        .optional()
        .describe("Two-letter state codes to limit results to, e.g. ['CA','TX']. Omit for all states."),
    }),
    execute: async ({ dateFrom, dateTo, states }) => {
      const supabase = await createClient();
      const { data, error } = await supabase.rpc("fn_report_jobs_by_state", {
        p_date_from: dateFrom ?? null,
        p_date_to: dateTo ?? null,
        p_states: states ?? null,
      });
      if (error) throw new Error(error.message);
      return data;
    },
  }),
};
