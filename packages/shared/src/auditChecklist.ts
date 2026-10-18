export type AuditChecklistDomain = 'staff' | 'clients' | 'operations' | 'records';

export type AuditChecklistItemKind = 'auto' | 'manual';

export type AuditChecklistItemStatus = 'pass' | 'warn' | 'fail' | 'pending' | 'complete' | 'not_applicable';

export interface AuditChecklistTemplateItem {
  key: string;
  domain: AuditChecklistDomain;
  kind: AuditChecklistItemKind;
  label: string;
  description: string;
  /** Oregon AFH–oriented; refine when state rules are confirmed. */
  regulatoryHint?: string;
  fixHref?: string;
}

export interface AuditChecklistItemResult {
  key: string;
  domain: AuditChecklistDomain;
  kind: AuditChecklistItemKind;
  label: string;
  description: string;
  status: AuditChecklistItemStatus;
  summary: string;
  fixHref?: string;
}

export interface AuditReadinessSummary {
  passCount: number;
  warnCount: number;
  failCount: number;
  pendingCount: number;
  totalCount: number;
  percentReady: number;
  byDomain: Record<
    AuditChecklistDomain,
    { pass: number; total: number }
  >;
  items: AuditChecklistItemResult[];
  generatedAt: string;
}

/** Static template — Phase 1 Oregon / adult foster home oriented. */
export const AUDIT_CHECKLIST_TEMPLATE: AuditChecklistTemplateItem[] = [
  {
    key: 'staff_cpr_on_file',
    domain: 'staff',
    kind: 'auto',
    label: 'CPR certification on file for caregivers',
    description: 'Every active caregiver has CPR issue and expiration dates recorded.',
    regulatoryHint: 'Surveyors commonly review caregiver training and CPR currency.',
    fixHref: '/training',
  },
  {
    key: 'staff_cpr_not_expired',
    domain: 'staff',
    kind: 'auto',
    label: 'No expired CPR certifications',
    description: 'No caregiver on the roster has CPR past its expiration date.',
    fixHref: '/training',
  },
  {
    key: 'staff_login_enabled',
    domain: 'staff',
    kind: 'auto',
    label: 'Caregivers can sign in for check-in',
    description: 'Each active caregiver has a staff login created by the supervisor.',
    fixHref: '/staff',
  },
  {
    key: 'staff_background_checks',
    domain: 'staff',
    kind: 'manual',
    label: 'Background checks on file',
    description: 'You maintain background screening records for each caregiver (upload or paper file).',
  },
  {
    key: 'staff_training_logs',
    domain: 'staff',
    kind: 'manual',
    label: 'Training logs maintained',
    description: 'Orientation and ongoing training is documented for each employee.',
  },
  {
    key: 'client_care_plan',
    domain: 'clients',
    kind: 'auto',
    label: 'Daily care plan documented',
    description: 'Each active client has a written daily care plan in their profile.',
    fixHref: '/clients',
  },
  {
    key: 'client_needs_documented',
    domain: 'clients',
    kind: 'auto',
    label: 'Health needs and preferences documented',
    description: 'Each client profile includes health problems and/or care needs.',
    fixHref: '/clients',
  },
  {
    key: 'client_caregiver_assigned',
    domain: 'clients',
    kind: 'auto',
    label: 'Caregiver assigned to each client',
    description: 'Every active client has at least one assigned employee.',
    fixHref: '/clients',
  },
  {
    key: 'client_hospital_plan',
    domain: 'clients',
    kind: 'auto',
    label: 'Hospital or physician care plan on file (recommended)',
    description: 'Hospital or discharge care plan PDF uploaded when available.',
    fixHref: '/clients',
  },
  {
    key: 'client_service_agreements',
    domain: 'clients',
    kind: 'manual',
    label: 'Signed service / admission agreements',
    description: 'Signed agreements are on file for each resident or client.',
  },
  {
    key: 'records_timesheets_recent',
    domain: 'records',
    kind: 'auto',
    label: 'Staff hours recorded (last 30 days)',
    description: 'Closed timesheets exist within the last 30 days.',
    fixHref: '/my-shift',
  },
  {
    key: 'records_schedule_exists',
    domain: 'records',
    kind: 'auto',
    label: 'Schedule on file',
    description: 'At least one scheduled shift exists for your facility.',
    fixHref: '/schedule',
  },
  {
    key: 'operations_emergency_plan',
    domain: 'operations',
    kind: 'manual',
    label: 'Emergency preparedness reviewed this year',
    description: 'Emergency plan reviewed and staff know evacuation and disaster procedures.',
  },
  {
    key: 'operations_incident_log',
    domain: 'operations',
    kind: 'manual',
    label: 'Incident / complaint log maintained',
    description: 'Falls, injuries, and complaints are logged with follow-up notes.',
  },
  {
    key: 'operations_mock_audit',
    domain: 'operations',
    kind: 'manual',
    label: 'Internal mock audit completed',
    description: 'You ran an internal review using this checklist in the last 6 months.',
  },
];

export const MANUAL_CHECKLIST_KEYS = AUDIT_CHECKLIST_TEMPLATE.filter((item) => item.kind === 'manual').map(
  (item) => item.key,
);
