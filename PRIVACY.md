# Privacy & Data Handling

## Remote Endpoint

When using the hosted endpoint, your queries are processed by:

- **Vercel** (serverless infrastructure) — see Vercel's privacy policy
- **Hetzner** (Docker deployment) — see Hetzner's privacy policy
- **Your AI client** (Claude, ChatGPT, etc.) — see their respective privacy policies

No query data is logged, stored, or retained by the MCP server itself. The server
is stateless — each request is processed and discarded.

## Local Installation

For maximum privacy, use the local npm package:

    npx @ansvar/dutch-standards-mcp

This runs entirely on your machine. No network requests are made except to your
local AI client.

## Data Collection

This MCP server:
- Does **not** collect, store, or transmit user queries
- Does **not** use cookies, analytics, or tracking
- Does **not** require authentication or user accounts
- Contains **only** publicly available data from authoritative sources

## Data Sources

All data in this MCP is sourced from publicly available Dutch government
publications, open-source repositories, and standards body reference data. See
`sources.yml` for the full list of data origins and their licenses.
