# Quality & Software Lifecycle

This directory holds the platform's quality discipline: policy statements, the risk register, intended-purpose declarations, the software development plan, release procedure, and versioning policy.

> **Why this exists even though we are NOT a medical device manufacturer:**
> The discipline modelled after ISO 13485 / IEC 62304 (lightly applied) keeps the codebase auditable, the data safe, and rebuilds reproducible — useful properties on their own. It also keeps an option open: if we ever onboard a customer who imposes vendor-quality requirements, the artifacts already exist.
>
> What we are **not** doing: pursuing a medical device certification, applying CE marking, classifying ourselves as MDSW under MDR. See [`non-medical-device-statement.md`](non-medical-device-statement.md) for the architectural guardrails that ensure we don't drift into that scope.

## Index

| File                                                                 | Purpose                                                                                  |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [`non-medical-device-statement.md`](non-medical-device-statement.md) | Hard non-MDR positioning + architectural guardrails. Read this first.                    |
| [`intended-purpose-register.md`](intended-purpose-register.md)       | Per-tool intended purpose statements. Mirrors `packages/config/src/intended-purpose.ts`. |
| [`risk-register.md`](risk-register.md)                               | Living risk register: hazards, likelihood, impact, mitigations.                          |
| [`software-development-plan.md`](software-development-plan.md)       | Lightweight SDLC documentation.                                                          |
| [`release-procedure.md`](release-procedure.md)                       | How a release happens: gates, validation, rollback.                                      |
| [`versioning.md`](versioning.md)                                     | Semver policy + UI version visibility.                                                   |
| [`change-log.md`](change-log.md)                                     | Human-readable release notes (in addition to git log).                                   |

## Maintenance

These documents are **living**: every Foundation phase update touches at least the risk register and changelog. They are reviewed in the release procedure (`release-procedure.md`).

Filenames in this directory must not contain `medical-device-readiness` or similar — wording matters for legal positioning.
