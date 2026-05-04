# Datenschutzerklärung (Entwurf)

> ⚠️ **Entwurf — nicht produktiv einsetzbar.** Diese Vorlage strukturiert eine DSGVO/DSG-konforme Datenschutzerklärung für Österreich. Vor Inbetriebnahme oder Kommerzialisierung **zwingend von einer/einem österreichischen Rechtsanwält:in prüfen lassen**. ADR-0010.

## Verantwortlicher

**Name:** TBD
**Anschrift:** TBD
**E-Mail:** privacy@dutyhive.com

## Allgemeines

Wir verarbeiten personenbezogene Daten ausschließlich auf Grundlage der DSGVO (Verordnung (EU) 2016/679) und des österreichischen Datenschutzgesetzes (DSG).

## Zwecke und Rechtsgrundlagen

| Zweck                               | Datenkategorie                    | Rechtsgrundlage                                     |
| ----------------------------------- | --------------------------------- | --------------------------------------------------- |
| Bereitstellung der Plattform        | Konto-, Nutzungsdaten             | Art. 6 Abs. 1 lit. b DSGVO (Vertrag)                |
| Sicherheit und Missbrauchserkennung | Log-Daten, gehashte IP/User-Agent | Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse) |
| Newsletter (sofern eingewilligt)    | E-Mail-Adresse, Sprachpräferenz   | Art. 6 Abs. 1 lit. a DSGVO (Einwilligung)           |
| Erfüllung rechtlicher Pflichten     | Aufbewahrungspflichtige Daten     | Art. 6 Abs. 1 lit. c DSGVO                          |

## Auftragsverarbeiter (Subprocessors)

Zur Erbringung des Dienstes bedienen wir uns externer Anbieter, die als Auftragsverarbeiter im Sinne des Art. 28 DSGVO tätig werden:

| Anbieter                     | Standort                  | Zweck                                            | DPA-/SCC-Status         |
| ---------------------------- | ------------------------- | ------------------------------------------------ | ----------------------- |
| Hetzner Online GmbH          | Deutschland (Falkenstein) | Hosting                                          | DPA gemäß Art. 28 DSGVO |
| Cloudflare, Inc.             | USA / EU-Optionen         | DNS, CDN, Email-Routing                          | SCC + DPA               |
| Resend                       | EU-Region                 | Versand transaktionaler/Newsletter-Mails         | DPA                     |
| Sentry (Functional Software) | EU-Region                 | Fehlerüberwachung                                | DPA                     |
| Trigger.dev                  | USA (EU-Region in Beta)   | Hintergrund-Jobs                                 | SCC + DPA               |
| GitHub, Inc. (Microsoft)     | USA                       | Quellcode-Hosting (keine Produktionsdaten)       | SCC                     |
| Vercel Inc.                  | USA                       | Domain-Registrar (kein Datenverarbeitungs-Plane) | n/a                     |

## Speicherdauer

- Konto-Daten: bis Kontolöschung + ggf. gesetzliche Aufbewahrungspflichten
- Log-Daten: TBD (typischerweise 14–90 Tage)
- Audit-Log: TBD (Compliance-getrieben, voraussichtlich 7 Jahre)
- Newsletter: bis Widerruf
- Rechnungen / Buchhaltung: 7 Jahre (§132 BAO)

## Betroffenenrechte

Sie haben jederzeit Anspruch auf:

- Auskunft (Art. 15 DSGVO)
- Berichtigung (Art. 16 DSGVO)
- Löschung (Art. 17 DSGVO) — soweit keine Aufbewahrungspflicht entgegensteht
- Einschränkung der Verarbeitung (Art. 18 DSGVO)
- Datenübertragbarkeit (Art. 20 DSGVO)
- Widerspruch (Art. 21 DSGVO)
- Widerruf einer erteilten Einwilligung (Art. 7 Abs. 3 DSGVO)
- Beschwerde bei der österreichischen Datenschutzbehörde (https://dsb.gv.at)

Anfragen richten Sie bitte an: privacy@dutyhive.com

## Cookies

Die Plattform setzt ausschließlich technisch notwendige Cookies (Session, CSRF-Schutz). Eine Einwilligungspflicht besteht hierfür nach §165 Abs. 3 TKG bzw. ePrivacy nicht. Werden in Zukunft analytische oder Marketing-Cookies gesetzt, holen wir vorab eine ausdrückliche Einwilligung über ein Cookie-Banner ein.

## Datensicherheit

Wir setzen technische und organisatorische Maßnahmen ein (TLS 1.3, Verschlüsselung at-rest auf Backups, Zugriffskontrolle via SSH-Keys, Postgres Row-Level-Security für Mandantentrennung).

## Änderungen

Diese Erklärung kann angepasst werden, wenn sich die Verarbeitung ändert. Wesentliche Änderungen werden auf dutyhive.com kommuniziert.

---

**Stand:** TBD
**Version:** 0.1-draft
