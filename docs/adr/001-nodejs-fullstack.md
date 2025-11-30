# ADR 001: Node.js Full-Stack Development

## Status
**DEPRECATED** - Backend superseded by ADR 005 (.NET Migration)

**Note**: Frontend remains Node.js/Vue.js 3. Backend migrated to .NET 8 for production readiness.

## Date
2025-11-16 (Updated: 2025-11-30 - Backend Deprecated)

## Context
Need unified technology stack for rapid full-stack development.

## Decision
Use Node.js ecosystem:
- Frontend: Vue.js 3 + TypeScript + Vite
- Backend: Express.js + TypeScript
- Database: MySQL (dev) → PostgreSQL (prod recommended)
- Testing: Jest + Vitest
- Containerization: Docker

## Consequences
- **Pros**: Unified TypeScript, fast development, single runtime
- **Cons**: Higher memory usage, JavaScript complexity
- **Risks**: Performance limits for CPU-intensive tasks

## Alternatives Considered
- Go + Vue.js (better performance, steeper learning)
- .NET + Vue.js (enterprise features, complex deployment)
- Python/Django + React (rapid prototyping, GIL limits)
- Rails + React (fast dev, performance constraints)

## Related
- ADR 002: AI-Assisted Development
- ADR 003: Database Choice
- **ADR 005: .NET Migration with Clean Architecture** (supersedes backend portion of this ADR)

## Update (2025-11-30)
The backend has been migrated to .NET 8 with Clean Architecture to address:
1. **Scalability**: Better file handling and resource management for large CNAB files
2. **Cloud-Native**: Architecture supports future migration to serverless (Lambda/Azure Functions)
3. **Performance**: Compiled code with better memory management
4. **Enterprise Readiness**: Strong typing, mature tooling, production-grade features

Frontend remains Vue.js 3 + TypeScript as decided in this ADR. See ADR 005 for backend migration details.