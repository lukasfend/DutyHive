# Intended Purpose Register

> Per-tool, per-product Intended Purpose statements. The wording matters: regulators classify software based on the manufacturer's claimed Intended Purpose (MDR Article 2(12)). Our claims are unambiguously administrative.
>
> The machine-readable mirror is `packages/config/src/intended-purpose.ts`. Both must agree.

## Conventions

Each tool has:

- **Intended Purpose** — what the tool _is_ for, in unambiguously administrative terms.
- **Out of scope** — what the tool is _explicitly not_ for.
- **Target user** — who is meant to use it (e.g., individual employee, shift planner, station admin).
- **Subject of data** — _who/what_ the data is about. Healthcare _workers_, _equipment_, _organizational units_ — never patients.
- **Risk classification (internal)** — the project's internal risk classification (low/medium/high) based on impact of malfunction, **not** an MDR class.

## Platform (`dutyhive.com`)

- **Intended Purpose:** Marketing and entry point for the DutyHive tool suite. Newsletter subscription. Public legal information.
- **Out of scope:** any functional tool. Marketing pages do not store or process user-specific operational data beyond newsletter opt-in.
- **Target user:** prospective and existing platform users browsing the public website.
- **Subject of data:** prospective subscribers (email + opt-in).
- **Risk classification (internal):** low.

## Account hub (`app.dutyhive.com`)

- **Intended Purpose:** Cross-tool account management — login, profile, organization membership, security settings.
- **Out of scope:** any product-specific data. The hub does not host scheduling, checklists, or vacation flows; those live under the respective product subdomains.
- **Target user:** any registered user of any DutyHive tool.
- **Subject of data:** the authenticated user (account, sessions, organizations).
- **Risk classification (internal):** medium (auth surface).

## Planner (`planner.dutyhive.com`) — planned, not built in Foundation

- **Intended Purpose:** Personal recording and visualization of an individual healthcare worker's own scheduled shifts. Calendar export (ICS) so the worker can see their shifts in their preferred calendar app.
- **Out of scope:**
  - Scheduling for or about other people.
  - Patient assignments.
  - Clinical workflow.
  - Time-and-attendance reporting to employers (employers should use Business).
- **Target user:** individual healthcare worker recording their own shifts.
- **Subject of data:** the individual user — their own shift entries, their own preferences, their own calendar.
- **Risk classification (internal):** low (single-user scope; data loss has personal but not clinical impact).

## Business (`business.dutyhive.com`) — planned, not built in Foundation

- **Intended Purpose:** Organizational shift planning and workforce administration for healthcare organizations: rostering, vacation/absence workflows, time accounts, location and station administration, employee qualifications and certifications.
- **Out of scope:**
  - Patient assignments.
  - Clinical decisions about patients.
  - Determining minimum staffing levels by clinical demand (a roster reflects organizational decisions, it does not make them).
  - Patient-care documentation.
- **Target user:** station leadership, shift planners, HR staff, employees of the organization.
- **Subject of data:** employees (workforce data), organizational units (locations, stations), shift definitions.
- **Risk classification (internal):** medium (multi-tenant; data error could affect an organization's pay calculations or staffing visibility).

## Checklists (`checklist.dutyhive.com`) — planned, not built in Foundation

- **Intended Purpose:** Configurable administrative checklists: equipment inventory checks, room-readiness checks (e.g., shock-room equipment present at shift start), material-stock audits, administrative procedure compliance (e.g., shift-handover paperwork).
- **Out of scope:** **strictly forbidden** uses (see [`non-medical-device-statement.md`](non-medical-device-statement.md)):
  - Patient-handover content (e.g., "patient X requires Y").
  - Pre-OP / clinical checklists tied to a specific patient.
  - Triage flows.
  - Any checklist where checking or skipping an item affects a clinical outcome of a specific identified patient.
- **Target user:** ward / station staff performing equipment-readiness audits at shift change; quality-management staff.
- **Subject of data:** organizational units, equipment, rooms, materials. **Not** patients.
- **Risk classification (internal):** medium (a wrong equipment audit could indirectly affect operations, but not directly affect patient care since it's an administrative inventory tool).

## Review trigger

Any feature request, customer ask, or development PR that proposes content / fields / flows that don't fit the above must trigger a review of this register and the [`non-medical-device-statement.md`](non-medical-device-statement.md). If the proposal would change the Intended Purpose toward "medical," it is rejected; if it stays administrative, the register is updated.
