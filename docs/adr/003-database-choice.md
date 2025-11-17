# ADR 003: MySQL Database Choice

## Status
Accepted

## Date
2025-11-16

## Context
Need reliable database for CNAB transaction processing with ACID compliance.

## Decision
Use MySQL 8.0+ for all environments:
- Production: MySQL (AWS RDS, Google Cloud SQL, or self-hosted)
- Development: MySQL via Docker
- Testing: MySQL Memory Server

## Consequences
- **Pros**: Familiar SQL, good transactional performance, wide adoption
- **Cons**: Fewer advanced features than PostgreSQL
- **Risks**: Future scalability limits, migration complexity

## Alternatives Considered
- PostgreSQL (advanced features, steeper learning)
- SQLite (simple dev, insufficient production concurrency)

## Implementation
- Docker Compose for local development
- Prisma ORM for type-safe access
- MySQL Memory Server for testing

## Future Considerations
Consider PostgreSQL for advanced features like JSONB or complex analytics.

## Related
- ADR 001: Node.js Full-Stack
- ADR 004: Transaction Type Lookup</content>
<parameter name="filePath">c:\projects\literate-sniffle\docs\adr\003-database-choice.md