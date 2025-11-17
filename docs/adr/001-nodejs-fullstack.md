# ADR 001: Node.js for Full-Stack Development

## Status
Accepted

## Date
2025-11-16

## Context
Need unified technology stack for rapid full-stack web development with consistent tooling.

## Decision
Use Node.js ecosystem:
- **Frontend**: Vue.js 3 + TypeScript + Vite
- **Backend**: Express.js + TypeScript + Node.js
- **Database**: MySQL (current) → PostgreSQL (recommended for production)
- **Testing**: Jest + Vitest
- **Containerization**: Docker

## Consequences

### Positive
- Unified TypeScript across stack
- Fast development with hot reload
- Single deployment runtime
- Large ecosystem support

### Negative
- JavaScript ecosystem complexity
- Higher memory usage
- Single point of failure

### Risks
- Performance limitations for CPU-intensive tasks
- Vendor lock-in to Node.js ecosystem

## Alternatives Considered
- **Go + Vue.js**: Better performance, steeper learning curve
- **.NET + Vue.js**: Enterprise features, complex deployment
- **Python/Django + React**: Rapid prototyping, GIL limitations
- **Rails + React**: Fast development, performance constraints

## Related Decisions
- ADR 002: AI-Assisted Development
- ADR 003: MySQL for Database Service