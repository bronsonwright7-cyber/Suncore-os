-- Seed data for lookup tables.
--
-- Note: priority, source, employee_type, and payment_status are text +
-- CHECK constraint columns (not tables) per the approved architecture, so
-- there are no rows to seed for them here. Their allowed values are
-- documented in docs/DATABASE.md and mirrored as TypeScript constants in
-- src/lib/constants.ts, which is the single source of truth for the app layer.
--
-- job_types is a real lookup table and is seeded below with a starting set
-- Office/Admin can edit or extend at any time.

insert into job_types (code, label, description) values
  ('INSTALL', 'New Installation', 'New solar system installation'),
  ('REPAIR', 'Repair', 'Repair of an existing system or component'),
  ('MAINTENANCE', 'Routine Maintenance', 'Scheduled/preventive maintenance'),
  ('INSPECTION', 'Inspection', 'System or site inspection'),
  ('WARRANTY', 'Warranty Service', 'Work covered under a manufacturer or workmanship warranty'),
  ('MONITORING', 'Monitoring Issue', 'Investigating a monitoring/production alert'),
  ('REMOVAL', 'Removal', 'System removal or decommission (e.g. for a roof replacement)'),
  ('OTHER', 'Other', 'Anything that doesn''t fit another category')
on conflict (code) do nothing;
