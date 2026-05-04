# Data Processing Agreement (DPA) / Auftragsverarbeitungsvertrag (AVV) Checklist

> Action item before commercialization. Foundation phase: documented; signing optional until first paying user. ADR-0010 makes lawyer review a hard gate.

## Subprocessors

| Provider                                | Role                                       | DPA URL                                                                                  | Status                                                        |
| --------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Hetzner Online GmbH (DE)                | Hosting (VPS, Storage Box, Object Storage) | https://www.hetzner.com/legal/order-processing-agreement                                 | [ ] Auto-generated in Hetzner Robot — check & download        |
| Cloudflare, Inc. (US, EU options)       | DNS, CDN                                   | https://www.cloudflare.com/cloudflare-customer-dpa/                                      | [ ] Accept in dashboard after DNS migration                   |
| Resend (US/EU)                          | Transactional email                        | https://resend.com/legal/dpa                                                             | [ ] Accept in dashboard                                       |
| Sentry (Functional Software, EU region) | Error monitoring                           | https://sentry.io/legal/dpa/                                                             | [ ] Self-serve at sentry.io/legal/dpa                         |
| Trigger.dev (US, EU beta)               | Background jobs                            | (request via support)                                                                    | [ ] Request DPA via support; document SCC                     |
| GitHub, Inc. (US/Microsoft)             | Source code hosting                        | https://docs.github.com/en/site-policy/privacy-policies/github-data-protection-agreement | [ ] SCC for free tier; document                               |
| Vercel Inc. (US)                        | Domain registrar only                      | n/a (registry-only, no data plane)                                                       | [ ] No DPA needed; consider migrating to Cloudflare Registrar |

## Foundation rules of engagement

1. No production user data is sent to any subprocessor not on this list.
2. New subprocessor → ADR + DPA + update `docs/legal/datenschutz.de.md` subprocessor list before deployment.
3. Annual review: have all DPAs been refreshed? Any provider acquired or relocated?
4. **Anwaltsfreigabe** (Austrian lawyer review) of `impressum.de.md`, `datenschutz.de.md`, `agb.de.md` is **mandatory** before charging any user.
