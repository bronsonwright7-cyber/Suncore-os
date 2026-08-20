/**
 * Hand-written mirror of supabase/migrations/*.sql, used to type-check
 * Supabase queries before a live project exists.
 *
 * THIS IS A BOOTSTRAP FILE. Once the Supabase project is created and the
 * migrations are applied, regenerate it from the real schema instead of
 * hand-editing:
 *
 *   npx supabase gen types typescript --linked > src/types/database.ts
 *
 * and re-run that after every future migration.
 *
 * Deliberately no intersection types (`A & B`) below, even though several
 * tables share the same created_at/updated_at/created_by/updated_by shape --
 * Supabase's client requires every table's Row/Insert/Update to structurally
 * satisfy `Record<string, unknown>` for type inference to work, and
 * TypeScript intersection types do NOT satisfy that check (a known TS
 * quirk), which silently collapses every query's result type to `never`
 * with no compile error at the point of the mistake. Real `supabase gen
 * types` output never uses intersections for this reason -- this file
 * matches that convention on purpose.
 *
 * Note: job_status_history, job_events, and audit_log are written only by
 * trusted database functions/triggers (see docs/DATABASE.md) -- that's
 * enforced by RLS and revoked grants at the database level, not by these
 * TypeScript types (matching how `supabase gen types` always generates full
 * Insert/Update shapes regardless of RLS). Don't call .insert()/.update() on
 * them from application code even though the types allow it.
 */

export type JobStatus =
  | "NEW"
  | "SCHEDULED"
  | "ASSIGNED"
  | "CREW_EN_ROUTE"
  | "ON_SITE"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "QA"
  | "CLOSED";

export type JobPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type JobSource =
  | "roofing_partner"
  | "solar_company"
  | "homeowner"
  | "warranty"
  | "referral"
  | "internal"
  | "other";

export type PaymentStatus = "NOT_INVOICED" | "INVOICED" | "PARTIALLY_PAID" | "PAID" | "VOID";

export type EmployeeType = "EMPLOYEE" | "CONTRACTOR" | "SUBCONTRACTOR";

export type CrewRole = "LEAD" | "MEMBER";

export type UserRole = "OWNER" | "ADMIN" | "OFFICE" | "CREW_LEAD" | "CREW_MEMBER" | "QA";

export type PartnerType = "roofing_partner" | "solar_company" | "other";

export type JobEventType =
  | "created"
  | "scheduled"
  | "rescheduled"
  | "assigned"
  | "reassigned"
  | "crew_en_route"
  | "arrived"
  | "work_started"
  | "photo_uploaded"
  | "document_added"
  | "note_added"
  | "work_completed"
  | "submitted_for_qa"
  | "qa_approved"
  | "qa_rejected"
  | "closed"
  | "status_changed"
  | "communication_logged";

export type CommunicationChannel = "phone" | "email" | "sms" | "in_person" | "other";
export type CommunicationDirection = "inbound" | "outbound";
export type AuditAction = "INSERT" | "UPDATE" | "DELETE";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          role: UserRole | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          role?: UserRole | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string | null;
          notes: string | null;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          email?: string | null;
          phone?: string | null;
          notes?: string | null;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["customers"]["Insert"]>;
        Relationships: [];
      };
      properties: {
        Row: {
          id: string;
          customer_id: string;
          address_line1: string;
          address_line2: string | null;
          city: string;
          state: string;
          postal_code: string;
          country: string;
          latitude: number | null;
          longitude: number | null;
          notes: string | null;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          customer_id: string;
          address_line1: string;
          address_line2?: string | null;
          city: string;
          state: string;
          postal_code: string;
          country?: string;
          latitude?: number | null;
          longitude?: number | null;
          notes?: string | null;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["properties"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "properties_customer_id_fkey";
            columns: ["customer_id"];
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      solar_systems: {
        Row: {
          id: string;
          property_id: string;
          system_size_kw: number | null;
          panel_count: number | null;
          panel_manufacturer: string | null;
          panel_model: string | null;
          inverter_manufacturer: string | null;
          inverter_model: string | null;
          install_date: string | null;
          monitoring_platform: string | null;
          monitoring_system_id: string | null;
          notes: string | null;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          property_id: string;
          system_size_kw?: number | null;
          panel_count?: number | null;
          panel_manufacturer?: string | null;
          panel_model?: string | null;
          inverter_manufacturer?: string | null;
          inverter_model?: string | null;
          install_date?: string | null;
          monitoring_platform?: string | null;
          monitoring_system_id?: string | null;
          notes?: string | null;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["solar_systems"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "solar_systems_property_id_fkey";
            columns: ["property_id"];
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      partners: {
        Row: {
          id: string;
          name: string;
          partner_type: PartnerType;
          contact_name: string | null;
          contact_phone: string | null;
          contact_email: string | null;
          notes: string | null;
          is_active: boolean;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          partner_type: PartnerType;
          contact_name?: string | null;
          contact_phone?: string | null;
          contact_email?: string | null;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["partners"]["Insert"]>;
        Relationships: [];
      };
      job_types: {
        Row: {
          id: string;
          code: string;
          label: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          label: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["job_types"]["Insert"]>;
        Relationships: [];
      };
      employees: {
        Row: {
          id: string;
          profile_id: string | null;
          first_name: string;
          last_name: string;
          phone: string | null;
          email: string | null;
          job_title: string | null;
          employee_type: EmployeeType;
          is_active: boolean;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          profile_id?: string | null;
          first_name: string;
          last_name: string;
          phone?: string | null;
          email?: string | null;
          job_title?: string | null;
          employee_type?: EmployeeType;
          is_active?: boolean;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["employees"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "employees_profile_id_fkey";
            columns: ["profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
            isOneToOne: true;
          },
        ];
      };
      crews: {
        Row: {
          id: string;
          name: string;
          is_active: boolean;
          notes: string | null;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          is_active?: boolean;
          notes?: string | null;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["crews"]["Insert"]>;
        Relationships: [];
      };
      crew_members: {
        Row: {
          id: string;
          crew_id: string;
          employee_id: string;
          role_in_crew: CrewRole;
          start_date: string;
          end_date: string | null;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          crew_id: string;
          employee_id: string;
          role_in_crew?: CrewRole;
          start_date?: string;
          end_date?: string | null;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["crew_members"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "crew_members_crew_id_fkey";
            columns: ["crew_id"];
            referencedRelation: "crews";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crew_members_employee_id_fkey";
            columns: ["employee_id"];
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
        ];
      };
      job_status_transitions: {
        Row: { from_status: JobStatus; to_status: JobStatus };
        Insert: { from_status: JobStatus; to_status: JobStatus };
        Update: Partial<Database["public"]["Tables"]["job_status_transitions"]["Insert"]>;
        Relationships: [];
      };
      jobs: {
        Row: {
          id: string;
          job_number: number;
          property_id: string;
          solar_system_id: string | null;
          job_type_id: string | null;
          status: JobStatus;
          priority: JobPriority;
          source: JobSource | null;
          partner_id: string | null;
          title: string;
          description: string | null;
          appointment_date: string | null;
          appointment_start_time: string | null;
          appointment_end_time: string | null;
          appointment_window: string | null;
          assigned_crew_id: string | null;
          assigned_employee_id: string | null;
          scheduling_notes: string | null;
          estimated_amount: number | null;
          approved_amount: number | null;
          invoice_amount: number | null;
          payment_status: PaymentStatus;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          property_id: string;
          solar_system_id?: string | null;
          job_type_id?: string | null;
          status?: JobStatus;
          priority?: JobPriority;
          source?: JobSource | null;
          partner_id?: string | null;
          title: string;
          description?: string | null;
          appointment_date?: string | null;
          appointment_start_time?: string | null;
          appointment_end_time?: string | null;
          appointment_window?: string | null;
          assigned_crew_id?: string | null;
          assigned_employee_id?: string | null;
          scheduling_notes?: string | null;
          estimated_amount?: number | null;
          approved_amount?: number | null;
          invoice_amount?: number | null;
          payment_status?: PaymentStatus;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        // `status` is deliberately excluded here too: it must be changed via
        // the fn_transition_job_status RPC, never a plain .update(). The
        // database enforces this regardless (UPDATE on the status column is
        // revoked for all client roles) -- this type just mirrors that.
        Update: Partial<Omit<Database["public"]["Tables"]["jobs"]["Insert"], "status">>;
        Relationships: [
          {
            foreignKeyName: "jobs_property_id_fkey";
            columns: ["property_id"];
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jobs_solar_system_id_fkey";
            columns: ["solar_system_id"];
            referencedRelation: "solar_systems";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jobs_job_type_id_fkey";
            columns: ["job_type_id"];
            referencedRelation: "job_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jobs_partner_id_fkey";
            columns: ["partner_id"];
            referencedRelation: "partners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jobs_assigned_crew_id_fkey";
            columns: ["assigned_crew_id"];
            referencedRelation: "crews";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jobs_assigned_employee_id_fkey";
            columns: ["assigned_employee_id"];
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
        ];
      };
      job_status_history: {
        Row: {
          id: string;
          job_id: string;
          from_status: JobStatus | null;
          to_status: JobStatus;
          changed_by: string | null;
          changed_at: string;
          reason: string | null;
        };
        Insert: {
          id?: string;
          job_id: string;
          from_status?: JobStatus | null;
          to_status: JobStatus;
          changed_by?: string | null;
          changed_at?: string;
          reason?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["job_status_history"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "job_status_history_job_id_fkey";
            columns: ["job_id"];
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      job_events: {
        Row: {
          id: string;
          job_id: string;
          event_type: JobEventType;
          actor_id: string | null;
          occurred_at: string;
          summary: string;
          event_data: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          job_id: string;
          event_type: JobEventType;
          actor_id?: string | null;
          occurred_at?: string;
          summary: string;
          event_data?: Record<string, unknown>;
        };
        Update: Partial<Database["public"]["Tables"]["job_events"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "job_events_job_id_fkey";
            columns: ["job_id"];
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_events_actor_id_fkey";
            columns: ["actor_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      job_assignments: {
        Row: {
          id: string;
          job_id: string;
          employee_id: string;
          crew_id: string | null;
          assigned_role: CrewRole;
          assigned_at: string;
          unassigned_at: string | null;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          job_id: string;
          employee_id: string;
          crew_id?: string | null;
          assigned_role?: CrewRole;
          assigned_at?: string;
          unassigned_at?: string | null;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["job_assignments"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "job_assignments_job_id_fkey";
            columns: ["job_id"];
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_assignments_employee_id_fkey";
            columns: ["employee_id"];
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_assignments_crew_id_fkey";
            columns: ["crew_id"];
            referencedRelation: "crews";
            referencedColumns: ["id"];
          },
        ];
      };
      photos: {
        Row: {
          id: string;
          job_id: string;
          storage_path: string;
          caption: string | null;
          taken_at: string | null;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          storage_path: string;
          caption?: string | null;
          taken_at?: string | null;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["photos"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "photos_job_id_fkey";
            columns: ["job_id"];
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      documents: {
        Row: {
          id: string;
          job_id: string;
          storage_path: string;
          file_name: string;
          document_type: string | null;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          storage_path: string;
          file_name: string;
          document_type?: string | null;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["documents"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "documents_job_id_fkey";
            columns: ["job_id"];
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      notes: {
        Row: {
          id: string;
          job_id: string;
          author_id: string | null;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          author_id?: string | null;
          body: string;
          created_at?: string;
        };
        // Notes are immutable once posted by convention/RLS (no update
        // policy) -- Office/Admin correct a mistake by deleting and
        // re-adding, not by editing in place.
        Update: Partial<Database["public"]["Tables"]["notes"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "notes_job_id_fkey";
            columns: ["job_id"];
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      communications: {
        Row: {
          id: string;
          customer_id: string;
          job_id: string | null;
          channel: CommunicationChannel;
          direction: CommunicationDirection;
          summary: string;
          occurred_at: string;
          logged_by: string | null;
        };
        Insert: {
          id?: string;
          customer_id: string;
          job_id?: string | null;
          channel: CommunicationChannel;
          direction: CommunicationDirection;
          summary: string;
          occurred_at?: string;
          logged_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["communications"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "communications_customer_id_fkey";
            columns: ["customer_id"];
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "communications_job_id_fkey";
            columns: ["job_id"];
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_log: {
        Row: {
          id: string;
          table_name: string;
          record_id: string;
          action: AuditAction;
          changed_by: string | null;
          changed_at: string;
          old_data: Record<string, unknown> | null;
          new_data: Record<string, unknown> | null;
        };
        Insert: {
          id?: string;
          table_name: string;
          record_id: string;
          action: AuditAction;
          changed_by?: string | null;
          changed_at?: string;
          old_data?: Record<string, unknown> | null;
          new_data?: Record<string, unknown> | null;
        };
        Update: Partial<Database["public"]["Tables"]["audit_log"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      jobs_crew_view: {
        Row: Omit<
          Database["public"]["Tables"]["jobs"]["Row"],
          | "scheduling_notes"
          | "estimated_amount"
          | "approved_amount"
          | "invoice_amount"
          | "payment_status"
          | "created_by"
          | "updated_by"
        >;
        Relationships: [];
      };
      // Deliberately not `Database["public"]["Tables"]["jobs"]["Row"] & {...}`
      // -- see the file header: intersection types don't satisfy the
      // Record<string, unknown> constraint Supabase's client requires.
      jobs_list_view: {
        Row: {
          id: string;
          job_number: number;
          property_id: string;
          solar_system_id: string | null;
          job_type_id: string | null;
          status: JobStatus;
          priority: JobPriority;
          source: JobSource | null;
          partner_id: string | null;
          title: string;
          description: string | null;
          appointment_date: string | null;
          appointment_start_time: string | null;
          appointment_end_time: string | null;
          appointment_window: string | null;
          assigned_crew_id: string | null;
          assigned_employee_id: string | null;
          scheduling_notes: string | null;
          estimated_amount: number | null;
          approved_amount: number | null;
          invoice_amount: number | null;
          payment_status: PaymentStatus;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
          customer_id: string;
          customer_first_name: string;
          customer_last_name: string;
          property_address_line1: string;
          property_city: string;
          property_state: string;
          assigned_crew_name: string | null;
          job_type_label: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      fn_transition_job_status: {
        Args: {
          p_job_id: string;
          p_to_status: JobStatus;
          p_reason?: string | null;
        };
        Returns: Database["public"]["Tables"]["jobs"]["Row"];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
