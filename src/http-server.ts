import { createServer } from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

import { handleSearchControls } from './tools/search-controls.js';
import { handleGetControl } from './tools/get-control.js';
import { handleListControls } from './tools/list-controls.js';
import { handleGetFramework } from './tools/get-framework.js';
import { handleListFrameworks } from './tools/list-frameworks.js';
import { handleCompareControls } from './tools/compare-controls.js';
import { handleGetIsoMapping } from './tools/get-iso-mapping.js';
import { handleSearchBySector } from './tools/search-by-sector.js';
import { handleAbout } from './tools/about.js';
import { handleListSources } from './tools/list-sources.js';
import { handleCheckDataFreshness } from './tools/check-data-freshness.js';
import { getFrameworkCount, getControlCount, getDbSizeMb } from './db.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const VERSION = '1.0.0';

function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'dutch-standards-mcp',
    version: VERSION,
  });

  server.tool(
    'search_controls',
    'Search Dutch government cybersecurity and information security controls by keyword (Dutch or English). Covers BIO2, DNB Good Practice IB, NEN 7510, NCSC-NL guidelines, DigiD, and Logius API Design Rules.',
    {
      query: z.string().describe('Search query in Dutch or English'),
      framework_id: z.string().optional().describe('Filter by framework ID (e.g. "bio2", "nen7510")'),
      category: z.string().optional().describe('Filter by control category'),
      language: z.enum(['nl', 'en']).optional().describe('Language preference for results'),
      limit: z.number().optional().describe('Maximum number of results to return'),
      offset: z.number().optional().describe('Number of results to skip for pagination'),
    },
    async (args) => handleSearchControls(args),
  );

  server.tool(
    'get_control',
    'Retrieve a specific Dutch security control by its unique ID, including full text, implementation guidance, and framework metadata.',
    {
      control_id: z.string().describe('Unique identifier of the control (e.g. "bio2-u.01", "nen7510-9.1.1")'),
    },
    async (args) => handleGetControl(args),
  );

  server.tool(
    'list_controls',
    'List all controls in a specified Dutch security framework, with optional filtering by category or level.',
    {
      framework_id: z.string().describe('Framework to list controls from (e.g. "bio2", "nen7510")'),
      category: z.string().optional().describe('Filter by category within the framework'),
      level: z.string().optional().describe('Filter by control level or tier'),
      language: z.string().optional().describe('Language preference for result labels'),
      limit: z.number().optional().describe('Maximum number of controls to return'),
      offset: z.number().optional().describe('Number of controls to skip for pagination'),
    },
    async (args) => handleListControls(args),
  );

  server.tool(
    'get_framework',
    'Retrieve metadata for a specific Dutch security framework: name, version, issuing body, scope, and summary statistics.',
    {
      framework_id: z.string().describe('Framework identifier (e.g. "bio2", "dnb-good-practice", "nen7510")'),
    },
    async (args) => handleGetFramework(args),
  );

  server.tool(
    'list_frameworks',
    'List all Dutch security and information security frameworks available in this MCP server, including BIO2, DNB Good Practice IB, NEN 7510, NCSC-NL, DigiD, and Logius API Design Rules.',
    {},
    async () => handleListFrameworks(),
  );

  server.tool(
    'compare_controls',
    'Compare how a security topic is addressed across multiple Dutch frameworks simultaneously. Returns matching controls from each specified framework for the given query.',
    {
      query: z.string().describe('Security topic or requirement to compare across frameworks'),
      framework_ids: z.array(z.string()).describe('List of framework IDs to compare (e.g. ["bio2", "nen7510"])'),
    },
    async (args) => handleCompareControls(args),
  );

  server.tool(
    'get_iso_mapping',
    'Find Dutch framework controls that map to a given ISO 27001/27002 control reference. Returns BIO2, NEN 7510, and other Dutch controls aligned to the specified ISO control.',
    {
      iso_control: z.string().describe('ISO 27001/27002 control reference (e.g. "A.9.1.1", "8.2")'),
    },
    async (args) => handleGetIsoMapping(args),
  );

  server.tool(
    'search_by_sector',
    'Search Dutch security controls relevant to a specific sector (e.g. healthcare, finance, government). Optionally narrow results with a keyword query.',
    {
      sector: z.string().describe('Target sector (e.g. "healthcare", "finance", "government", "water")'),
      query: z.string().optional().describe('Optional keyword query to narrow results within the sector'),
    },
    async (args) => handleSearchBySector(args),
  );

  server.tool(
    'about',
    'Return a description of this MCP server: what it covers, which Dutch security frameworks are included, data sources, and usage guidance.',
    {},
    async () => handleAbout(),
  );

  server.tool(
    'list_sources',
    'List all primary data sources used in this MCP server, including source URLs, issuing organisations, version numbers, and last-updated dates for each Dutch security framework.',
    {},
    async () => handleListSources(),
  );

  server.tool(
    'check_data_freshness',
    'Check whether the embedded Dutch security framework data is current. Returns the last-updated date for each framework and flags any sources that may be outdated.',
    {},
    async () => handleCheckDataFreshness(),
  );

  return server;
}

const httpServer = createServer(async (req, res) => {
  if (req.url === '/health' && req.method === 'GET') {
    try {
      const frameworks = getFrameworkCount();
      const controls = getControlCount();
      const db_size_mb = getDbSizeMb();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        version: VERSION,
        category: 'domain_intelligence',
        stats: { frameworks, controls, db_size_mb },
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', error: String(err) }));
    }
    return;
  }

  if (req.url === '/mcp' && req.method === 'POST') {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    const server = createMcpServer();
    await server.connect(transport);
    await transport.handleRequest(req, res);
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

httpServer.listen(PORT, () => {
  console.log(`Dutch Standards MCP HTTP server listening on port ${PORT}`);
});
