# Contributing

Thank you for your interest in contributing to dutch-standards-mcp.

## Development Setup

```bash
git clone https://github.com/Ansvar-Systems/dutch-standards-mcp.git
cd dutch-standards-mcp
npm install
node --import tsx scripts/seed-test-db.ts
npm test
```

## Pull Requests

1. Fork the repository
2. Create a feature branch from `dev`
3. Write tests for new functionality
4. Run `npm test` and `npm run lint`
5. Submit a PR to `dev`

## Code Standards

- TypeScript strict mode
- Tests required for all tools
- Follow existing patterns in `src/tools/`
