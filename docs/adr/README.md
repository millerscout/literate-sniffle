# Architecture Decision Records

ADRs document significant architectural decisions for the Literate Sniffle project.

## When to Create an ADR

Create ADRs for decisions with significant impact:
- Technology stack choices
- Major architectural patterns
- Infrastructure decisions
- Security architecture
- Performance-critical choices
- Breaking changes

## Process

1. **Draft**: Write ADR with "Proposed" status
2. **Review**: Share with team for feedback
3. **Approve**: Update to "Accepted" when consensus reached
4. **Implement**: Put decision into practice
5. **Monitor**: Update if unexpected issues arise

## Format

Each ADR follows this structure:

### Required Sections
- **Title**: Clear, descriptive title (ADR XXX: [Title])
- **Status**: Current status (Accepted, Proposed, Rejected, Superseded, Deprecated)
- **Date**: When the decision was made (or last updated)
- **Context**: Background, requirements, and constraints
- **Decision**: What was decided and rationale
- **Consequences**: Positive/negative outcomes and risks

### Optional Sections
- **Alternatives Considered**: Other options evaluated with pros/cons
- **Related Decisions**: Links to related ADRs
- **Implementation Notes**: Technical details of implementation
- **Future Considerations**: Known limitations or future improvements

## Status Definitions

- **Proposed**: Decision is being considered, open for discussion
- **Accepted**: Decision approved and implemented
- **Rejected**: Decision declined with rationale
- **Superseded**: Replaced by a newer ADR
- **Deprecated**: No longer relevant or actively maintained

## Current ADRs

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [001](001-nodejs-fullstack.md) | Node.js Full-Stack Development | Accepted (Backend Superseded by 005) | 2025-11-16 |
| [002](002-ai-assisted-development.md) | AI-Assisted Development | Accepted | 2025-11-16 |
| [003](003-database-choice.md) | MySQL Database Choice | Accepted | 2025-11-16 |
| [004](004-transaction-description-storage.md) | Transaction Description Storage | Accepted | 2025-11-16 |
| [005](005-dotnet-migration-clean-architecture.md) | .NET Migration with Clean Architecture | Accepted | 2025-11-30 |

## How to Create a New ADR

### Step-by-Step Process

1. **Choose ADR Number**: Use next sequential number (004, 005, etc.)
2. **Copy Template**: Use the template below as starting point
3. **Fill in Details**: Complete all required sections
4. **Set Initial Status**: Start with "Proposed"
5. **Create Pull Request**: Submit for team review
6. **Team Discussion**: Present and discuss in team meeting
7. **Incorporate Feedback**: Update based on team input
8. **Final Approval**: Change status to "Accepted" when approved
9. **Update Index**: Add to this README table

### File Naming Convention
- `XXX-descriptive-name.md` (e.g., `004-database-migration-strategy.md`)
- Use lowercase, hyphen-separated names
- Keep names descriptive but concise

### Review Checklist
- [ ] Context clearly explains the problem/need
- [ ] Decision is well-justified with rationale
- [ ] Alternatives are fairly evaluated
- [ ] Consequences (positive/negative) are identified
- [ ] Implementation approach is feasible
- [ ] Related decisions are referenced
- [ ] Status and date are correct

## Template

```markdown
# ADR XXX: [Descriptive Title]

## Status
Proposed

## Date
YYYY-MM-DD

## Context
[Describe the background, requirements, and constraints that led to this decision.
What problem are we trying to solve? What are the requirements?
Include any relevant data, user stories, or technical constraints.]

## Decision
[What decision was made and why?
Be specific about what was chosen and the key reasons for choosing it.
Include implementation details if relevant.]

## Consequences

### Positive
- [List positive outcomes and benefits]
- [Include measurable improvements where possible]

### Negative
- [List drawbacks and trade-offs]
- [Include any compromises made]

### Risks
- [List potential risks and mitigation strategies]
- [Include monitoring or fallback plans]

## Alternatives Considered

### [Alternative 1 Name]
**Description**: [Brief description]
**Pros**: [List advantages]
**Cons**: [List disadvantages]
**Why Rejected**: [Rationale for not choosing this]

### [Alternative 2 Name]
**Description**: [Brief description]
**Pros**: [List advantages]
**Cons**: [List disadvantages]
**Why Rejected**: [Rationale for not choosing this]

## Related Decisions
- ADR 001: [Related decision title]
- ADR 002: [Related decision title]

## Implementation Notes
[Any technical details, migration plans, or rollout strategies.
Include code examples if helpful.]

## Future Considerations
[Known limitations, potential improvements, or areas for future evaluation.
When this decision might need to be revisited.]
```

## Best Practices

### Writing ADRs
- **Be Specific**: Include concrete details, not vague generalities
- **Focus on Why**: Explain rationale, not just what was decided
- **Balance Objectivity**: Present alternatives fairly
- **Consider Future**: Think about long-term implications
- **Keep Current**: Update status and content as decisions evolve

### Reviewing ADRs
- **Challenge Assumptions**: Question underlying requirements
- **Consider Scale**: Think about future growth and changes
- **Evaluate Trade-offs**: Weigh short-term vs long-term benefits
- **Think Holistically**: Consider impact on entire system

### Maintaining ADRs
- **Regular Review**: Revisit decisions quarterly or when context changes
- **Update Status**: Mark superseded decisions appropriately
- **Link Related**: Maintain connections between related decisions
- **Archive Old**: Move deprecated ADRs to archive folder if needed

## Integration with Development

### Git Workflow
- ADRs should be committed with related implementation
- Use conventional commit messages: `docs(adr): add ADR XXX for [decision]`
- Review ADRs in same PR as implementation when possible

### Team Communication
- Share new ADRs in team channels
- Reference ADR numbers in code comments and documentation
- Use ADRs to explain architectural choices in code reviews

### Documentation Links
- Reference ADRs in README and other documentation
- Include ADR links in PR descriptions for architectural changes
- Use ADRs to onboard new team members