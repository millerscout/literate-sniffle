# ADR 003: MySQL for Database Service

## Status
Accepted

## Date
2025-11-16

## Context
Need reliable database for CNAB transaction processing with ACID compliance and good performance. Chose MySQL for simplicity and familiarity.

## Decision
**Database**: MySQL 8.0+ for all environments
- **Production**: MySQL (AWS RDS, Google Cloud SQL, or self-hosted)
- **Development**: MySQL via Docker
- **Testing**: MySQL Memory Server for isolated testing

## Consequences

### Positive
- Familiar SQL syntax and ecosystem
- Good performance for transactional workloads
- Wide adoption and community support
- Easy scaling with read replicas
- Comprehensive tooling and management

### Negative
- Less advanced features than PostgreSQL
- Some MySQL-specific limitations
- Vendor considerations for enterprise use

### Risks
- Future scalability limitations
- Migration complexity if switching to PostgreSQL later

## Alternatives Considered
- **PostgreSQL**: Advanced features, better for complex queries, but steeper learning curve
- **SQLite**: Simple development, insufficient for production concurrency

## Implementation
- Docker Compose for local development
- Prisma ORM for type-safe database access
- MySQL Memory Server for isolated testing

## Future Considerations
PostgreSQL could be evaluated for future production needs requiring advanced features like JSONB, advanced indexing, or complex analytical queries.

## Related Decisions
- ADR 001: Node.js Full-Stack Development
- ADR 004: Transaction Type Lookup Table</content>
<parameter name="filePath">c:\projects\literate-sniffle\docs\adr\003-database-choice.md