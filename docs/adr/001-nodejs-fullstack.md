# ADR 001: Node.js Full-Stack Development

## Status
Accepted

## Date
2025-11-16

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