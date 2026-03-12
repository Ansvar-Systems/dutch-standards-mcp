# Dutch Standards MCP

[![npm version](https://img.shields.io/npm/v/@ansvar/dutch-standards-mcp)](https://www.npmjs.com/package/@ansvar/dutch-standards-mcp)
[![CI](https://github.com/Ansvar-Systems/dutch-standards-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Ansvar-Systems/dutch-standards-mcp/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)
[![MCP Registry](https://img.shields.io/badge/MCP%20Registry-ansvar.ai%2Fmcp-blue)](https://ansvar.ai/mcp)

Structured access to Dutch government cybersecurity standards: BIO2, DNB Good Practice Informatiebeveiliging, NEN 7510/7512/7513, NCSC-NL web application and TLS guidelines, DigiD Normenkader, and Logius API Design Rules. Bilingual Dutch/English with FTS search, ISO 27002:2022 cross-references, and sector-based filtering.

Part of the [Ansvar MCP Network](https://ansvar.ai/mcp) — specialist MCP servers for compliance and security intelligence.

---

## Quick Start

### Remote endpoint (no installation)

Add to your MCP client config:

```json
{
  "mcpServers": {
    "dutch-standards": {
      "url": "https://dutch-standards-mcp.vercel.app/mcp"
    }
  }
}
```

### Local (stdio via npx)

**Claude Desktop** — edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dutch-standards": {
      "command": "npx",
      "args": ["-y", "@ansvar/dutch-standards-mcp"]
    }
  }
}
```

**Cursor** — edit `.cursor/mcp.json` in your project:

```json
{
  "mcpServers": {
    "dutch-standards": {
      "command": "npx",
      "args": ["-y", "@ansvar/dutch-standards-mcp"]
    }
  }
}
```

**VS Code / GitHub Copilot** — add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "dutch-standards": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@ansvar/dutch-standards-mcp"]
    }
  }
}
```

---

## What's Included

| Source | Authority | Items | Language | Refresh |
|--------|-----------|-------|----------|---------|
| BIO2 (Baseline Informatiebeveiliging Overheid) | CIP/BZK | ~93 controls | NL+EN | Annual |
| DNB Good Practice Informatiebeveiliging 2023 | DNB | ~58 controls | NL+EN | Annual |
| NEN 7510:2017 / NEN 7512:2022 / NEN 7513:2023 | NEN | ~200 requirements | NL | 5-year cycle |
| NCSC-NL ICT Security Guidelines for Web Applications | NCSC-NL | ~200 requirements | NL | Annual |
| DigiD ICT Security Assessment Normenkader 3.0 | Logius | 21 norms | NL | Annual |
| NCSC-NL Security Guidelines for TLS 2.1 | NCSC-NL | ~50 recommendations | NL+EN | Annual |
| Logius NLGov REST API Design Rules 2.0 | Logius | ~80 rules | NL+EN | Monthly |

**Total:** ~700 controls and requirements across 7 frameworks.

For full coverage details, see [COVERAGE.md](COVERAGE.md).

---

## What's NOT Included

| Gap | Status |
|-----|--------|
| TIBER-NL (financial sector red-team framework) | Not planned — methodology document, not a control catalog |
| VIR-BI (classified information) | Not planned — state secrets regime, not publicly available |
| ENSIA (municipal audit framework) | Not planned — audit framework, not a control standard |
| Cyberbeveiligingswet (NIS2 implementation) | Planned — law not yet in force as of 2026-03-12 |
| BRP and eHerkenning requirements | Planned for v0.2 |
| NEN full normative text | Excluded — commercial NEN license required |
| ISO/IEC 27001:2022 full text | Excluded — commercial ISO license; ISO cross-references available via `get_iso_mapping` |

For the complete gap list, see [COVERAGE.md — What's NOT Included](COVERAGE.md#whats-not-included).

---

## Available Tools

| Tool | Category | Description |
|------|----------|-------------|
| `search_controls` | Search | Full-text search across all 7 frameworks. Returns controls ranked by FTS5 relevance. |
| `search_by_sector` | Search | Returns frameworks for a sector (`government`, `healthcare`, `finance`, etc.), optionally filtered by keyword. |
| `get_control` | Lookup | Full record for a single control: bilingual description, implementation guidance, ISO mapping. |
| `get_framework` | Lookup | Metadata for a framework: issuing body, version, control count, category breakdown. |
| `list_controls` | Lookup | All controls in a framework, filterable by category and BBN level. Paginated. |
| `compare_controls` | Comparison | Side-by-side comparison of the same topic across 2–4 frameworks. |
| `get_iso_mapping` | Comparison | All Dutch controls mapped to a given ISO 27002:2022 control reference. |
| `list_frameworks` | Meta | Lists all frameworks in the database with summary stats. |
| `about` | Meta | Server version, build date, and coverage statistics. |
| `list_sources` | Meta | Data provenance: authority, standard name, retrieval method, license for each source. |
| `check_data_freshness` | Meta | Per-source freshness status against the expected refresh schedule. |

For full parameter documentation, return formats, and examples, see [TOOLS.md](TOOLS.md).

---

## Data Sources & Freshness

| Source | Last Refresh | Refresh Schedule |
|--------|-------------|-----------------|
| BIO2 | 2026-03-12 | Annual |
| DNB Good Practice IB | 2026-03-12 | Annual |
| NEN 7510/7512/7513 | 2026-03-12 | 5-year cycle |
| NCSC-NL Web App Guidelines | 2026-03-12 | Annual |
| DigiD Normenkader | 2026-03-12 | Annual |
| NCSC-NL TLS Guidelines | 2026-03-12 | Annual |
| Logius API Design Rules | 2026-03-12 | Monthly |

The `ingest.yml` workflow runs automatically on the most frequent source schedule. The `check-updates.yml` workflow runs daily and creates a GitHub issue if any source is overdue.

To check freshness at runtime, call `check_data_freshness`. Full source provenance and licenses: [sources.yml](sources.yml).

---

## Security

This repository runs 6-layer automated security scanning on every push and weekly:

| Layer | Tool | What it checks |
|-------|------|----------------|
| Static analysis | CodeQL | Code vulnerabilities |
| SAST | Semgrep | Security anti-patterns |
| Container / dependency scan | Trivy | Known CVEs in dependencies |
| Secret detection | Gitleaks | Leaked credentials |
| Supply chain | OSSF Scorecard | Repository security posture |
| Dependency updates | Dependabot | Automated dependency PRs |

---

## Disclaimer

**THIS TOOL IS NOT PROFESSIONAL ADVICE.**

This MCP provides structured access to Dutch cybersecurity standards sourced from authoritative publications. It is provided for informational and research purposes only.

- Verify critical compliance decisions against the original standards
- Data is a snapshot — sources update, and there may be a delay between upstream changes and database refresh
- NEN 7510/7512/7513 content is limited to what is publicly available; full normative text requires a NEN license
- See [DISCLAIMER.md](DISCLAIMER.md) for the full disclaimer and no-warranty statement

---

## Ansvar MCP Network

This server is part of the [Ansvar MCP Network](https://ansvar.ai/mcp) — 149 specialist MCP servers covering legislation, compliance frameworks, and cybersecurity standards.

| Category | Servers | Coverage |
|----------|---------|----------|
| Law MCPs | 108 | 119 countries, 668K+ laws |
| EU Regulations | 1 | 61 regulations, 4,054 articles |
| Security frameworks | 1 | 262 frameworks, 1,451 SCF controls |
| Domain-specific | ~48 | CVE, STRIDE, sanctions, OWASP, healthcare, financial, and more |

Browse the full directory at [ansvar.ai/mcp](https://ansvar.ai/mcp).

---

## Development

### Branch strategy

`feature-branch → PR to dev → verify on dev → PR to main → deploy`

Never push directly to `main`. `main` triggers npm publish and Vercel deployment.

### Setup

```bash
git clone https://github.com/Ansvar-Systems/dutch-standards-mcp.git
cd dutch-standards-mcp
npm install
npm run build
npm test
```

### Ingestion

```bash
# Full pipeline: fetch → diff → build DB → update coverage
npm run ingest:full

# Individual steps
npm run ingest:fetch     # Download latest data from upstream sources
npm run ingest:diff      # Check for changes against current DB
npm run build:db         # Rebuild SQLite database
npm run coverage:update  # Regenerate coverage.json and COVERAGE.md

# Check freshness
npm run freshness:check
```

### Pre-deploy verification

```bash
npm run build            # Gate 1: build
npm run lint             # Gate 2: TypeScript strict
npm test                 # Gate 3: unit tests
npm run test:contract    # Gate 4: golden contract tests
sqlite3 data/standards.db "PRAGMA integrity_check;"   # Gate 5: DB integrity
npm run coverage:verify  # Gate 6: coverage consistency
```

---

## License & Data Licenses

**Code:** [Apache-2.0](LICENSE)

**Data licenses by source:**

| Source | License |
|--------|---------|
| BIO2 (MinBZK GitHub) | CC0-1.0 |
| DNB Good Practice IB | Public sector publication |
| NEN 7510/7512/7513 | NEN standard (extracted reference data only) — see [NEN terms](https://www.nen.nl/en/terms-of-use) |
| NCSC-NL guidelines | CC BY 4.0 |
| DigiD Normenkader | Public sector publication |
| Logius API Design Rules | CC BY 4.0 |

All data is extracted from publicly available or licensed authoritative publications. Zero AI-generated content in the database. See [sources.yml](sources.yml) for complete provenance.
