# Coverage — Dutch Standards MCP

> Last verified: 2026-03-12 | Database version: 0.1.0

This document declares exactly what data the Dutch Standards MCP contains, what it does not contain, and the limitations of each source. It is the contract with users.

---

## What's Included

| Source | Authority | Items | Version / Date | Completeness | Refresh |
|--------|-----------|-------|----------------|-------------|---------|
| BIO2 (Baseline Informatiebeveiliging Overheid) | CIP/BZK | ~93 controls | 2.0 (2024-01-01) | Full | Annual |
| DNB Good Practice Informatiebeveiliging 2023 | De Nederlandsche Bank | ~58 controls | 2023 | Full | Annual |
| NEN 7510:2017 / NEN 7512:2022 / NEN 7513:2023 | NEN | ~200 requirements | 7510:2017, 7512:2022, 7513:2023 | Partial (see note) | 5-year cycle |
| NCSC-NL ICT Security Guidelines for Web Applications | NCSC-NL | ~200 requirements | 2023 | Full | Annual |
| DigiD ICT Security Assessment Normenkader 3.0 | Logius | 21 norms | 3.0 (2023) | Full | Annual |
| NCSC-NL Security Guidelines for TLS 2.1 | NCSC-NL | ~50 recommendations | 2.1 (2021) | Full | Annual |
| Logius NLGov REST API Design Rules | Logius | ~80 rules | 2.0 (2024-01-01) | Full | Monthly |

**Total:** 11 tools, 543 controls/requirements, database built from 9 authoritative Dutch sources.

### NEN 7510 / 7512 / 7513 Coverage Note

NEN standards are paid publications. The database contains control identifiers, titles, and category structures extracted from the publicly available previews and summaries on NEN Connect. Full normative text (detailed requirements, measurement criteria) is not included because it is subject to NEN's commercial license. Organizations that need the full text must obtain a NEN license directly.

---

## What's NOT Included

| Gap | Reason | Planned? |
|-----|--------|----------|
| TIBER-NL (Threat Intelligence Based Ethical Red-Teaming) | DNB framework for financial sector red-team testing — methodology document, not a control catalog | No |
| VIR-BI (Voorschrift Informatiebeveiliging Rijksdienst Bijzondere Informatie) | Covers classified information handling (state secrets) — not publicly available | No |
| ENSIA (Eenduidige Normatiek Single Information Audit) | Audit framework for municipalities, not a control standard itself | No |
| Cyberbeveiligingswet (NIS2 implementation) | Dutch NIS2 transposition law — not yet in force as of database build date (2026-03-12) | Yes — planned once law enters force |
| Wbni (Wet beveiliging netwerk- en informatiesystemen) | The predecessor NIS1 transposition — superseded by NIS2 implementation | No |
| WDO (Wet digitale overheid) | Dutch Digital Government Act — sets access and identity requirements, not a security control framework | No |
| BRP (Basisregistratie Personen) security requirements | Logius BRP requirements — separate from DigiD Normenkader | Yes — v0.2 |
| eHerkenning security requirements | Logius eHerkenning requirements — separate procurement process | Yes — v0.2 |
| NCTV sector security standards (vital infrastructure) | Ministry of Justice sector-specific standards — not publicly consolidated | No |
| ISO/IEC 27001:2022 (full standard) | Commercial ISO standard — reference mappings included via `iso_mapping` field, full text excluded | No |
| NEN-EN-ISO/IEC 27001:2023 (Dutch adoption) | Dutch NEN adoption of ISO 27001:2023 — commercial license | No |
| CIS Controls v8 | International framework — out of scope for Dutch-specific MCP | No |

---

## Limitations

- **NEN full text excluded.** NEN 7510, 7512, and 7513 are commercial standards. Only control identifiers, titles, and category structures are included. Use `get_control` to retrieve what's available; implementation guidance fields may be empty for NEN controls.
- **ISO mapping is partial.** Not all controls have `iso_mapping` populated. BIO2 has the most complete ISO 27002:2022 mapping; other frameworks have varying coverage. `get_iso_mapping` only returns controls with an explicit mapping.
- **Snapshot data, not live.** The database is a point-in-time extract. Standards may be updated between database rebuilds. The `check_data_freshness` tool reports the last-fetched date for each source.
- **Dutch as primary language.** All controls have Dutch titles and descriptions. English translations are available for BIO2, DNB, NCSC-NL TLS, and Logius API Design Rules. NEN 7510/7512/7513 and DigiD Normenkader are Dutch-only in this database.
- **No case law or guidance letters.** The database contains normative controls only, not interpretive guidance, enforcement decisions, or sector supervisor letters.
- **Sector metadata may be incomplete.** Frameworks are tagged with `scope_sectors` values during ingestion. If a framework's sector coverage is broader than what's tagged, `search_by_sector` may not surface it.
- **Not a legal opinion.** Compliance with these standards is not verified by this tool. The tool provides structured access to control text — whether a specific system or process meets a control is a judgment that requires qualified assessment.

---

## Data Freshness Schedule

| Source | Refresh Schedule | Last Refresh | Next Expected |
|--------|-----------------|-------------|---------------|
| BIO2 | Annual | 2026-03-12 | 2027-01-01 |
| DNB Good Practice IB | Annual | 2026-03-12 | 2027-01-01 |
| NEN 7510/7512/7513 | 5-year cycle | 2026-03-12 | 2028-01-01 |
| NCSC-NL Web App Guidelines | Annual | 2026-03-12 | 2027-01-01 |
| DigiD Normenkader | Annual | 2026-03-12 | 2027-01-01 |
| NCSC-NL TLS Guidelines | Annual | 2026-03-12 | 2027-01-01 |
| Logius API Design Rules | Monthly | 2026-03-12 | 2026-04-12 |

To check current freshness status programmatically, call the `check_data_freshness` tool.

The ingestion pipeline (`ingest.yml`) runs on the most frequent source schedule. The `check-updates.yml` workflow runs daily and creates a GitHub issue if any source is overdue.

---

## Regulatory Mapping

This table maps Dutch regulations and laws to the frameworks in this MCP that implement or operationalize them.

| Regulation / Law | Relevant Frameworks | Notes |
|-----------------|---------------------|-------|
| Wet beveiliging netwerk- en informatiesystemen (Wbni) | BIO2, NEN 7510 | Wbni applies to operators of essential services and digital service providers |
| Algemene Verordening Gegevensbescherming (AVG / GDPR) | BIO2, NEN 7510, NEN 7512 | Security of personal data — Article 32 technical measures |
| Wet op de geneeskundige behandelingsovereenkomst (WGBO) | NEN 7510, NEN 7512, NEN 7513 | Electronic health records and patient data security |
| Baseline Informatiebeveiliging Overheid (BIO2) | BIO2 | Directly mandatory for all Dutch government bodies (Rijksoverheid, provinces, municipalities, water boards) |
| DigiD access requirements | DigiD Normenkader | Mandatory for all organizations connecting to DigiD |
| Government REST API requirements | Logius API Design Rules | Mandatory for Dutch government REST APIs |
| DNB supervisory requirements (financial sector) | DNB Good Practice IB | Applied by DNB in ongoing supervision of banks, insurers, payment institutions |

---

## Sector-Specific Gaps

### Government (Rijksoverheid, provinces, municipalities)

- **Included:** BIO2 (full), Logius API Design Rules, DigiD Normenkader
- **Gap:** ENSIA self-assessment framework for municipalities not included
- **Gap:** VIR-BI (classified information) not included — out of scope (state secrets regime)

### Healthcare

- **Included:** NEN 7510, NEN 7512, NEN 7513 (control identifiers and titles)
- **Gap:** Full NEN normative text excluded (commercial license)
- **Gap:** NICTIZ implementation guidelines not included
- **Gap:** IGJ (healthcare inspectorate) sector-specific security requirements not included

### Financial Services

- **Included:** DNB Good Practice Informatiebeveiliging 2023
- **Gap:** AFM cybersecurity guidance not included
- **Gap:** TIBER-NL red-team methodology not included
- **Gap:** EBA ICT Risk guidelines (EU-level) not included — see EU Regulations MCP

### Critical Infrastructure (Energy, Water, Telecom, Transport)

- **Included:** BIO2 (for government-owned infrastructure)
- **Gap:** NCTV sector security standards not included (not publicly consolidated)
- **Gap:** NEN-EN 50600 (data center standards) not included
- **Gap:** Sector-specific Wbni implementation guides not included
