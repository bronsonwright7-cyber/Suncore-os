-- Indexes for the operational queries the app will run constantly.
-- Postgres does not auto-index foreign keys, so FK columns used in lookups
--/joins are indexed explicitly below.

-- jobs: the dashboard/command-center and crew views filter on these constantly.
create index jobs_status_idx on jobs (status);
create index jobs_priority_idx on jobs (priority);
create index jobs_source_idx on jobs (source);
create index jobs_appointment_date_idx on jobs (appointment_date);
create index jobs_assigned_crew_id_idx on jobs (assigned_crew_id);
create index jobs_assigned_employee_id_idx on jobs (assigned_employee_id);
create index jobs_property_id_idx on jobs (property_id);
create index jobs_solar_system_id_idx on jobs (solar_system_id);
create index jobs_partner_id_idx on jobs (partner_id);
create index jobs_job_type_id_idx on jobs (job_type_id);
-- Common dashboard query: a crew's schedule for a given day.
create index jobs_crew_appointment_date_idx on jobs (assigned_crew_id, appointment_date);

-- "Jobs by customer" goes through properties.customer_id.
create index properties_customer_id_idx on properties (customer_id);
create index solar_systems_property_id_idx on solar_systems (property_id);

-- Timeline / audit trail lookups: always fetched as "for this job, in order".
create index job_events_job_id_occurred_at_idx on job_events (job_id, occurred_at);
create index job_status_history_job_id_changed_at_idx on job_status_history (job_id, changed_at);

-- Crew membership and assignment lookups.
create index crew_members_employee_id_idx on crew_members (employee_id);
create index job_assignments_job_id_idx on job_assignments (job_id);
create index job_assignments_employee_id_idx on job_assignments (employee_id);

-- Employees/crews.
create index employees_profile_id_idx on employees (profile_id);

-- Photos/documents/notes/communications: always fetched "for this job"/"for
-- this customer".
create index photos_job_id_idx on photos (job_id);
create index documents_job_id_idx on documents (job_id);
create index notes_job_id_idx on notes (job_id);
create index communications_customer_id_idx on communications (customer_id);
create index communications_job_id_idx on communications (job_id);

-- Audit log lookups by record.
create index audit_log_table_record_idx on audit_log (table_name, record_id);
