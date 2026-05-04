# Non-Medical-Device Positioning

**Status:** binding architectural and legal positioning.
**Date:** 2026-05-04
**Decided by:** the principal.

## Statement

DutyHive is **not** a medical device under EU Regulation 2017/745 (MDR) and is not intended to become one.

All current and planned tools (`Planner`, `Business`, `Checklists`) have a strictly **administrative / workforce-management** intended purpose. They do not diagnose, treat, monitor, alleviate, or prevent disease, injury, or disability. They do not process patient data. They do not provide clinical decision support.

This positioning is permanent.

## Why

A solo developer cannot realistically meet MDR / ISO 13485 obligations: notified-body involvement (€50k+ for Class IIa), the Person Responsible for Regulatory Compliance role (Article 15 MDR), post-market surveillance, vigilance reporting, formal QMS audit (€10–30k), clinical evaluation. Choosing to remain outside the medical-device scope is the only realistic path while remaining solvent.

The healthcare-adjacent products serve healthcare _workers_, not healthcare _delivery_. Shift planning, vacation requests, time accounts, equipment-inventory checklists — these are HR and asset-management functions. The fact that the users happen to work in healthcare does not make the software medical.

## Architectural guardrails

The following are **never** to be built into DutyHive. These are absolute rules; a feature request matching any of these must be either reframed or rejected.

### Data model

- **No patient entities.** No `Patient` table, no patient-id columns, no patient PII fields anywhere.
- **No clinical observations.** No vital signs, no diagnostic codes (ICD-10, SNOMED CT, LOINC) attached to identifiable individuals.
- **No medication records.** No drug names, dosages, prescriptions tied to a person.

### Features

- **No diagnosis.** No suggestions like "this combination of symptoms indicates X."
- **No treatment recommendation.** No "take Y mg of Z" output.
- **No clinical decision support.** No "if patient is in state X, do Y" workflows.
- **No triage.** No prioritization of patients based on clinical state.
- **No risk scoring of patients.** No dekubitus risk, no fall risk, no sepsis early-warning.
- **No clinical alarms.** No notifications based on patient condition.
- **No clinical documentation.** Not a digital patient record, not an OP-Bericht generator, not a Krankenpflege-Anamnese tool.

### Checklists specifically

The Checklists tool is the most likely candidate for accidental clinical drift. **Hard rule for that tool:**

✅ **Allowed:** equipment audits ("are X bandages in storage room A?"), material counts, room-readiness checks (inventory-style), administrative procedure checklists (e.g., "shift handover paperwork done?").

❌ **Forbidden:** patient-handover content, pre-OP clinical checklists tied to a specific patient, anything where ticking or skipping an item could affect a clinical outcome of a specific patient.

When a customer asks for a clinical checklist, the answer is: "We don't support that. Use a dedicated MDSW vendor."

### Wording in marketing and UI

- Never claim "medical," "clinical," "diagnostic," "therapeutic," "klinisch," "diagnostisch," "Therapie" in marketing copy.
- Always frame as "for healthcare workers," "for shift planning," "for organizational use," "Dienstplanung," "Schichtarbeit," "Personalverwaltung."
- Negative-Abgrenzung statement is documented in [`docs/legal/agb.de.md`](../legal/agb.de.md) — placed in the legal text, not in the marketing UI (per the principal's choice).

## Operational rules

1. **Feature triage:** if a product feature suggestion crosses any guardrail above, the engineer (or assistant) must flag it and route it back to scope review before implementation.
2. **Code review (self-review or future contributor):** during review, look for new database fields, API endpoints, or UI flows that introduce patient context. Reject those.
3. **Customer requests:** customers may _try_ to use the platform clinically. We are not liable, and we do not implement features that enable that. Document declined requests in `change-log.md` so the trail exists.

## Review

This statement is reviewed annually or when the product roadmap proposes a new sub-product. A review either reaffirms the positioning or formally proposes opting into MDR — which would be a major project decision (board-level if a board exists by then).
