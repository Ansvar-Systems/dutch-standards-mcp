# Tools — Dutch Standards MCP

> 11 tools across 4 categories: search, lookup, comparison, and meta

---

## Search Tools

### `search_controls`

Full-text search across all Dutch cybersecurity controls using FTS5. Returns controls ranked by relevance from the combined BIO2, DNB, NEN, NCSC-NL, DigiD, and Logius datasets. Use this when you need to find controls by keyword without knowing the framework.

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | Yes | Search terms, e.g. `"toegangsbeveiliging"`, `"encryption"`, `"incident response"` |
| `framework_id` | string | No | Restrict results to one framework, e.g. `"BIO2"`, `"DNB"`, `"NEN7510"` |
| `category` | string | No | Filter by control category, e.g. `"Toegangsbeveiliging"` |
| `language` | `"nl"` \| `"en"` | No | Preferred display language for titles. Defaults to Dutch (`"nl"`). Controls without an English title always show Dutch. |
| `limit` | integer | No | Maximum results to return. Default: `20`. |
| `offset` | integer | No | Pagination offset. Default: `0`. |

**Returns:** A Markdown table with columns `ID`, `Control`, `Title`, `Framework`, `Category`, `Level` plus a `total_results` count above the table.

**Example:**
```
"Which Dutch government controls address password management?"
-> search_controls({ query: "wachtwoord", language: "nl" })

"Find BIO2 controls on encryption"
-> search_controls({ query: "encryptie", framework_id: "BIO2" })
```

**Data sources:** All 7 frameworks (BIO2, DNB, NEN7510, NEN7512, NEN7513, NCSC-NL-WebApp, NCSC-NL-TLS, DigiD, Logius-API)

**Limitations:**
- FTS5 phrase search: special characters (`"`, `^`, `*`, `-`, `:`) are stripped from the query before matching
- Searches bilingual content — a Dutch-only query may miss English-only descriptions in the same control
- Does not support wildcard or regex patterns
- Relevance ranking is FTS5 rank, not semantic similarity

---

### `search_by_sector`

Returns frameworks applicable to a specific sector, optionally filtered by a keyword query within those frameworks. Use this to scope a compliance review to a particular industry before drilling into controls.

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `sector` | string | Yes | One of: `government`, `healthcare`, `finance`, `energy`, `telecom`, `transport`, `water`, `digital_infrastructure`, `education` |
| `query` | string | No | Optional keyword search within the sector's frameworks |

**Returns:** A Markdown table of matching frameworks (ID, name, issuing body, version, control count, language). If `query` is provided, a second table lists matching controls within those frameworks (top 10 per framework, ranked by FTS5 relevance).

**Example:**
```
"What security frameworks apply to Dutch healthcare organizations?"
-> search_by_sector({ sector: "healthcare" })

"Which healthcare controls cover audit logging?"
-> search_by_sector({ sector: "healthcare", query: "auditlog" })
```

**Data sources:** Framework `scope_sectors` metadata + FTS5 on controls

**Limitations:**
- Sector taxonomy is fixed to the 9 values listed above
- A framework appears only if it was ingested with sector metadata — frameworks without `scope_sectors` are not returned
- Query within sector does not cross-search frameworks not assigned to that sector

---

## Lookup Tools

### `get_control`

Retrieves the full record for a single control by its database ID. Returns the complete bilingual description, implementation guidance, verification guidance, ISO 27002 mapping, and source URL. Use this after `search_controls` or `list_controls` to get the full text of a specific control.

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `control_id` | string | Yes | The control's database ID, e.g. `"BIO2-5.1"`, `"DNB-03"`, `"NEN7510-A.9.1.1"` |

**Returns:** A structured Markdown document with control number, Dutch and English titles, framework and issuing body, category, level, ISO 27002 mapping, Dutch description (`Beschrijving`), English description, implementation guidance, verification guidance, and source URL.

**Example:**
```
"Give me the full text of BIO2 control 5.1"
-> get_control({ control_id: "BIO2-5.1" })
```

**Data sources:** `controls` table joined to `frameworks`

**Limitations:**
- Returns a `NO_MATCH` error if the ID does not exist — use `search_controls` or `list_controls` to discover valid IDs
- Implementation guidance and verification guidance may be absent for some controls (especially NEN standards where full text is licensed)
- Not all controls have English descriptions — Dutch is always present

---

### `get_framework`

Returns metadata for a single framework: issuing body, version, effective date, language, scope, control count, category breakdown, and source URL. Use this to understand what a framework covers before listing its controls.

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `framework_id` | string | Yes | Framework identifier, e.g. `"BIO2"`, `"DNB"`, `"NEN7510"`, `"NCSC-NL-TLS"`, `"DigiD"`, `"Logius-API"` |

**Returns:** A Markdown document with framework name (Dutch and English), issuing body, version, language, control count, effective date, sectors, scope description, structure description, license, and a category breakdown table.

**Example:**
```
"What is the BIO2 framework and how many controls does it have?"
-> get_framework({ framework_id: "BIO2" })
```

**Data sources:** `frameworks` table, `controls` aggregate

**Limitations:**
- Does not return the controls themselves — use `list_controls` to enumerate them
- Sector and scope fields depend on ingestion quality; some frameworks may have incomplete metadata

---

## Comparison Tools

### `list_controls`

Lists all controls in a framework, with optional filtering by category and level. Returns a paginated table. Use this to browse a complete framework or to enumerate controls within a specific control category.

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `framework_id` | string | Yes | Framework identifier, e.g. `"BIO2"`, `"NEN7510"` |
| `category` | string | No | Filter to one category, e.g. `"Toegangsbeveiliging"` |
| `level` | string | No | Filter by BBN level: `"BBN1"`, `"BBN2"`, `"BBN3"` (BIO2 only) |
| `language` | `"nl"` \| `"en"` | No | Preferred display language for titles. Defaults to Dutch. |
| `limit` | integer | No | Maximum results. Default: `50`. |
| `offset` | integer | No | Pagination offset. Default: `0`. |

**Returns:** A Markdown table with columns `ID`, `Control`, `Title`, `Category`, `Level` plus a `total_results` count.

**Example:**
```
"List all BIO2 controls at BBN2 level"
-> list_controls({ framework_id: "BIO2", level: "BBN2" })

"Show me all NEN 7510 access control requirements"
-> list_controls({ framework_id: "NEN7510", category: "Toegangsbeveiliging" })
```

**Data sources:** `controls` table

**Limitations:**
- Category and level values must match exactly as stored in the database — use `get_framework` to see the available categories first
- Default limit of 50 may truncate large frameworks (BIO2 has ~93 controls, NEN7510 ~150)

---

### `compare_controls`

Searches the same keyword query across 2–4 frameworks simultaneously and shows the top 5 matching controls per framework side by side. Use this to compare how different Dutch standards treat the same topic.

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | Yes | Topic to compare, e.g. `"toegangsbeveiliging"`, `"logging"`, `"encryptie"` |
| `framework_ids` | string[] | Yes | 2 to 4 framework IDs, e.g. `["BIO2", "NEN7510"]` or `["BIO2", "DNB", "DigiD", "Logius-API"]` |

**Returns:** A Markdown section per framework showing the control number, title, and a 150-character snippet of the Dutch description for up to 5 matching controls.

**Example:**
```
"How do BIO2 and DNB Good Practice differ in their approach to access control?"
-> compare_controls({ query: "toegangsbeveiliging", framework_ids: ["BIO2", "DNB"] })

"Compare incident response requirements across BIO2, NEN 7510, and DigiD"
-> compare_controls({ query: "incident", framework_ids: ["BIO2", "NEN7510", "DigiD"] })
```

**Data sources:** FTS5 on `controls` filtered by `framework_id`

**Limitations:**
- Returns at most 5 controls per framework — not a full comparison of all matching controls
- Snippets are truncated at 150 characters; use `get_control` for full text
- Both frameworks must be in the database; passing an unknown ID silently returns zero results for that framework

---

### `get_iso_mapping`

Returns all Dutch controls that map to a specific ISO 27002:2022 control number. Use this to find which Dutch standards implement a given ISO requirement, or to check Dutch compliance coverage for an ISO audit.

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `iso_control` | string | Yes | ISO 27002:2022 control reference, e.g. `"5.15"`, `"8.2"`, `"6.1"` |

**Returns:** A Markdown table grouped by framework, listing each Dutch control mapped to that ISO reference (ID, control number, title).

**Example:**
```
"Which Dutch controls implement ISO 27002 control 5.15 (Identity management)?"
-> get_iso_mapping({ iso_control: "5.15" })

"Show me all Dutch framework controls that map to ISO 27002 8.2"
-> get_iso_mapping({ iso_control: "8.2" })
```

**Data sources:** `controls.iso_mapping` field

**Limitations:**
- Only returns controls with an exact `iso_mapping` match — controls without ISO mapping are not included
- ISO mapping coverage varies by framework: BIO2 has extensive mapping; NEN 7510 mapping is partial
- Does not support partial matches or range queries (e.g. `"5.x"` will not match)

---

## Meta Tools

### `list_frameworks`

Returns a summary table of all frameworks in the database. No parameters required. Use this to discover which frameworks are available before calling `get_framework` or `list_controls`.

**Parameters:** None

**Returns:** A Markdown table listing framework ID, name, issuing body, version, control count, language, and sectors for each framework in the database.

**Example:**
```
"What Dutch cybersecurity frameworks does this MCP cover?"
-> list_frameworks()
```

**Data sources:** `frameworks` table joined to control counts

**Limitations:**
- Lists only frameworks loaded in the current database build — reflects ingestion coverage
- Sector data may be empty for frameworks ingested without sector metadata

---

### `about`

Returns server metadata: version, category, schema version, database build date, and coverage statistics (framework count, control count, database size). Use this to check the current version and data state of the MCP.

**Parameters:** None

**Returns:** A Markdown document with server name, version, category, schema version, database build date, and a coverage metrics table (frameworks, controls, database size in MB).

**Example:**
```
"What version of the Dutch Standards MCP is running and when was it last updated?"
-> about()
```

**Data sources:** `db_metadata` table

**Limitations:**
- Database build date reflects when the SQLite database was compiled, not the publication date of the source standards
- Call `check_data_freshness` for per-source freshness status

---

### `list_sources`

Returns the data provenance table: for each source, the authority, standard name, retrieval method, and license. Use this to understand where the data comes from before relying on it in a compliance decision.

**Parameters:** None

**Returns:** A Markdown table with columns `ID`, `Authority`, `Standard / Document`, `Retrieval method`, `License`. Includes a disclaimer note about verifying against authoritative sources.

**Example:**
```
"Where does this MCP get its data from, and what are the licenses?"
-> list_sources()
```

**Data sources:** Hardcoded provenance list (sourced from `sources.yml`)

**Limitations:**
- The fallback list is hardcoded; full YAML parsing requires an optional dependency not included in the default build
- Does not show per-source item counts or last-refresh dates — use `check_data_freshness` for that

---

### `check_data_freshness`

Reports how current each data source is against its expected refresh schedule. Returns a per-source status: `Current`, `Due in N days`, or `OVERDUE (N days)`. Use this to verify the database is not stale before using it for compliance decisions.

**Parameters:** None

**Returns:** A Markdown table with columns `Source`, `Last fetched`, `Refresh window`, `Status`. Includes a summary of any overdue or due-soon sources and instructions to trigger a data update.

**Example:**
```
"Is the Dutch Standards MCP data up to date?"
-> check_data_freshness()
```

**Data sources:** `data/coverage.json` (generated by `npm run coverage:update`)

**Limitations:**
- Returns a "no coverage data" message if `coverage.json` has not been generated yet — run `npm run coverage:update` after first build
- Status is based on the `last_fetched` date in `coverage.json`, not a live check of upstream sources
- `OVERDUE` status means the data is past its scheduled refresh window, not necessarily that the data has changed

---

## Dutch Cybersecurity Glossary

This glossary covers terms used in Dutch government cybersecurity standards that appear as parameters, category names, or framework identifiers in the tools above.

| Term | Expansion | Meaning |
|------|-----------|---------|
| **BBN** | Basisbeveiligingsniveau | Baseline security level. BIO2 defines three: BBN1 (basic), BBN2 (standard government), BBN3 (high-risk systems). Used as `level` parameter in `list_controls`. |
| **BIO** | Baseline Informatiebeveiliging Overheid | The mandatory information security baseline for all Dutch government bodies. BIO2 is the current version (2024), based on ISO 27002:2022. Issued by CIP/BZK. |
| **SIVA** | Strategisch / Inhoudelijk / Verbindend / Afstemmend | The four government roles in Dutch information security governance. Determines which BBN level applies to a system based on its strategic, substantive, connecting, or coordinating function. |
| **Normenkader** | — | A normative framework or set of norms. Used specifically for the DigiD ICT Security Assessment Normenkader 3.0 (Logius), which sets 21 security norms for organizations connecting to DigiD. |
| **Zorgplicht** | — | Duty of care. A legal obligation on organizations (especially critical infrastructure operators and government bodies) to take appropriate security measures. Referenced in NIS2 and Dutch cybersecurity law. |
| **Meldplicht** | — | Reporting obligation. Requirement to notify a supervisory authority (e.g., the NCSC, the DPA) of a security incident or data breach within a defined timeframe. |
| **Overheidsmaatregelen** | — | Government measures. Refers to the set of technical and organizational controls mandated by the Dutch government for specific system classifications under BIO2. |
| **NCSC-NL** | Nationaal Cyber Security Centrum | The Dutch national cybersecurity authority, part of the Ministry of Justice and Security. Issues guidelines for web applications, TLS, and other technical topics. Framework ID: `NCSC-NL-WebApp`, `NCSC-NL-TLS`. |
| **DNB** | De Nederlandsche Bank | The Dutch central bank and financial sector supervisor. Publishes the Good Practice Informatiebeveiliging for financial institutions. Framework ID: `DNB`. |
| **NEN** | Nederlands Normalisatie-instituut | The Dutch standards body. Publishes NEN 7510 (healthcare information security), NEN 7512 (electronic data exchange in healthcare), and NEN 7513 (electronic patient records). |
| **Logius** | — | The Dutch government's digital services agency (part of BZK). Issues the DigiD Normenkader and the NLGov REST API Design Rules. Framework IDs: `DigiD`, `Logius-API`. |
