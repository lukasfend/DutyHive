/**
 * Per-tool Intended Purpose declarations.
 *
 * This is the machine-readable mirror of `docs/quality/intended-purpose-register.md`.
 * Both documents must agree. The text content here can be surfaced in legal /
 * about pages, in API responses (e.g. for an enterprise customer's vendor
 * questionnaire), and for internal lint checks.
 *
 * IMPORTANT: any change here also changes the platform's claimed Intended
 * Purpose under EU MDR Article 2(12). The current claims are intentionally,
 * unambiguously administrative. Do not soften the "out of scope" language.
 *
 * See `docs/quality/non-medical-device-statement.md` for the architectural
 * guardrails that ensure the implementation matches these claims.
 */

export type RiskClass = 'low' | 'medium' | 'high';

export interface IntendedPurpose {
  /** Tool key — matches subdomains.ts where applicable. */
  readonly key: string;
  /** Human-readable display name. */
  readonly displayName: string;
  /** What the tool IS for, in unambiguously administrative terms. */
  readonly purpose: string;
  /** What the tool is EXPLICITLY NOT for. Used for legal positioning. */
  readonly outOfScope: readonly string[];
  /** Who is meant to use it. */
  readonly targetUser: string;
  /** Who or what the data is ABOUT. Never patients. */
  readonly subjectOfData: string;
  /** Internal risk classification (NOT an MDR class). */
  readonly riskClass: RiskClass;
  /** True if the tool is built and shipped in the current release. */
  readonly available: boolean;
}

export const intendedPurpose = {
  platform: {
    key: 'platform',
    displayName: 'DutyHive Platform',
    purpose:
      'Marketing and entry point for the DutyHive tool suite. Newsletter subscription. Public legal information.',
    outOfScope: [
      'Functional tooling — marketing pages do not store or process user-specific operational data beyond newsletter opt-in.',
    ],
    targetUser: 'Prospective and existing platform users browsing the public website.',
    subjectOfData: 'Newsletter subscribers (email and opt-in only).',
    riskClass: 'low',
    available: true,
  },
  account: {
    key: 'account',
    displayName: 'Account Hub',
    purpose:
      'Cross-tool account management — login, profile, organization membership, security settings.',
    outOfScope: [
      'Product-specific data; the hub does not host scheduling, checklists, or vacation flows.',
    ],
    targetUser: 'Any registered user of any DutyHive tool.',
    subjectOfData: 'The authenticated user (account, sessions, organizations).',
    riskClass: 'medium',
    available: true,
  },
  planner: {
    key: 'planner',
    displayName: 'Planner',
    purpose:
      "Personal recording and visualization of an individual healthcare worker's own scheduled shifts. Calendar export (ICS) so the worker can see their shifts in their preferred calendar app.",
    outOfScope: [
      'Scheduling for or about other people.',
      'Patient assignments.',
      'Clinical workflow.',
      'Time-and-attendance reporting to employers.',
    ],
    targetUser: 'Individual healthcare worker recording their own shifts.',
    subjectOfData:
      'The individual user — their own shift entries, their own preferences, their own calendar.',
    riskClass: 'low',
    available: false,
  },
  business: {
    key: 'business',
    displayName: 'Business',
    purpose:
      'Organizational shift planning and workforce administration for healthcare organizations: rostering, vacation/absence workflows, time accounts, location and station administration, employee qualifications and certifications.',
    outOfScope: [
      'Patient assignments.',
      'Clinical decisions about patients.',
      'Determining minimum staffing levels by clinical demand.',
      'Patient-care documentation.',
    ],
    targetUser: 'Station leadership, shift planners, HR staff, employees of the organization.',
    subjectOfData: 'Employees, organizational units (locations, stations), shift definitions.',
    riskClass: 'medium',
    available: false,
  },
  checklist: {
    key: 'checklist',
    displayName: 'Checklists',
    purpose:
      'Configurable administrative checklists: equipment inventory checks, room-readiness checks (e.g., shock-room equipment present at shift start), material-stock audits, administrative procedure compliance.',
    outOfScope: [
      'Patient-handover content.',
      'Pre-OP / clinical checklists tied to a specific patient.',
      'Triage flows.',
      'Any checklist where checking or skipping an item affects a clinical outcome of a specific identified patient.',
    ],
    targetUser:
      'Ward / station staff performing equipment-readiness audits at shift change; quality-management staff.',
    subjectOfData: 'Organizational units, equipment, rooms, materials. Not patients.',
    riskClass: 'medium',
    available: false,
  },
} as const satisfies Record<string, IntendedPurpose>;

export type ToolKey = keyof typeof intendedPurpose;
