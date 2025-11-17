# ADR 002: AI-Assisted Development

## Status
Accepted

## Date
2025-11-16

## Context
AI coding assistants improve productivity but need quality controls.

## Decision
Use GitHub Copilot with strict guidelines:
- AI for scaffolding, boilerplate, and prototyping
- Human review required for all AI-generated code
- Follow `.github/copilot-instructions.md` standards
- Maintain 80% test coverage

## Consequences
- **Pros**: 3-5x faster code generation, consistent standards
- **Cons**: Risk of over-reliance, additional review burden
- **Risks**: AI hallucinations, security vulnerabilities

## Alternatives Considered
- No AI (significantly slower development)
- Limited AI (misses productivity gains)
- Multiple AI tools (increases complexity)

## Implementation
- Coding standards in `.github/copilot-instructions.md`
- Mandatory human review
- Regular quality audits

## Related
- ADR 001: Node.js Full-Stack
- ADR 003: Database Choice