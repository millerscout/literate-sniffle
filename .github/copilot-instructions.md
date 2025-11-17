# GitHub Copilot Instructions for Literate Sniffle

This document provides guidelines for AI-assisted development in the Literate Sniffle project. Following these rules ensures consistent, maintainable, and high-quality code.

## Project Overview

**Literate Sniffle** is a full-stack TypeScript application featuring:
- Vue.js 3 frontend with TypeScript
- Express backend with TypeScript
- SQLite database with Prisma ORM
- Docker containerization
- Comprehensive testing (80% coverage target)

## TypeScript Standards

### Strict Mode Requirements
- **Always use strict TypeScript settings** - no `any` types, explicit null checks
- **Interface over type aliases** for object shapes
- **Enum for fixed values** instead of string literals
- **Generic constraints** for reusable components

```typescript
// ✅ Good
interface User {
  id: number;
  email: string;
  name: string;
  createdAt: Date;
}

// ❌ Avoid
type User = {
  id: any;
  email: string;
  name?: string;
  createdAt: string;
};
```

### Error Handling
- **Explicit error types** with custom error classes
- **Never throw generic Error** - use specific error types
- **Async/await over Promises** for better readability

```typescript
// ✅ Good
class ValidationError extends Error {
  constructor(field: string, message: string) {
    super(`Validation failed for ${field}: ${message}`);
    this.name = 'ValidationError';
  }
}

// ❌ Avoid
throw new Error('Something went wrong');
```

## Testing Requirements

### Coverage Targets
- **80% minimum coverage** for branches, functions, lines, and statements
- **Critical path testing** - test all user journeys and error paths
- **Mock external dependencies** (API calls, database)

### Test Structure
```typescript
describe('ComponentName', () => {
  it('should handle success case', () => {
    // Arrange
    const mockData = { /* ... */ };

    // Act
    const result = doSomething(mockData);

    // Assert
    expect(result).toBe(expectedValue);
  });

  it('should handle error case', () => {
    // Test error scenarios
  });
});
```

### Test Naming
- **Descriptive test names** that explain the behavior being tested
- **Given-When-Then format** for complex scenarios

```typescript
// ✅ Good
it('should create user when valid data provided', () => {
it('should throw ValidationError when email is invalid', () => {

// ❌ Avoid
it('works', () => {
it('test user creation', () => {
```

## Code Style Guidelines

### Naming Conventions
- **PascalCase** for components, interfaces, classes, enums
- **camelCase** for variables, functions, methods
- **SCREAMING_SNAKE_CASE** for constants
- **kebab-case** for file names

### File Organization
```
src/
├── components/     # Vue components
├── views/         # Page components
├── composables/   # Vue composables
├── utils/         # Utility functions
├── types/         # TypeScript type definitions
└── tests/         # Test files
```

### Import Order
1. **Vue imports** first
2. **Third-party libraries**
3. **Local imports** (utils, types, components)
4. **Relative imports**

```typescript
// ✅ Good
import { ref, computed } from 'vue';
import axios from 'axios';
import { formatDate } from '@/utils/date';
import type { User } from '@/types/user';
import UserCard from './UserCard.vue';
```

## Vue.js Best Practices

### Composition API
- **Prefer Composition API** over Options API
- **Reactive variables** with `ref()` or `reactive()`
- **Computed properties** for derived state
- **Watchers** only when necessary

```vue
<script setup lang="ts">
import { ref, computed, watch } from 'vue';

const users = ref<User[]>([]);
const searchTerm = ref('');

const filteredUsers = computed(() =>
  users.value.filter(user =>
    user.name.toLowerCase().includes(searchTerm.value.toLowerCase())
  )
);
</script>
```

### Component Structure
- **Single responsibility** per component
- **Props with defaults** and validation
- **Emits for parent communication**
- **Slots for flexible content**

## Backend Development

### API Design
- **RESTful conventions** with consistent URL patterns
- **HTTP status codes** appropriately (200, 201, 400, 404, 500)
- **JSON responses** with consistent structure
- **Input validation** with middleware

### Database Operations
- **Prisma Client** for type-safe database access
- **Transactions** for multi-step operations
- **Error handling** for database constraints
- **Migrations** for schema changes

## Git Commit Conventions

### Commit Message Format
```
type(scope): description

[optional body]

[optional footer]
```

### Types
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes
- **refactor**: Code refactoring
- **test**: Test additions/changes
- **chore**: Maintenance tasks

### Examples
```
feat(auth): add user login functionality
fix(api): handle null values in user response
test(users): add integration tests for user creation
docs(readme): update installation instructions
```

## AI Development Tips

### Context Awareness
- **Read existing code** before making changes
- **Understand the architecture** and data flow
- **Check test files** to understand expected behavior
- **Review related components** for consistency

### Incremental Changes
- **Small, focused changes** rather than large rewrites
- **Test after each change** to ensure functionality
- **Update related files** (tests, types, documentation)
- **Verify build passes** before committing

### Code Quality Checks
- **TypeScript compilation** without errors
- **Linting passes** with no warnings
- **Tests pass** with adequate coverage
- **No console.log** in production code

### When to Ask for Help
- **Complex business logic** requiring domain knowledge
- **Architecture decisions** affecting multiple components
- **Performance optimizations** requiring benchmarking
- **Security considerations** needing expert review

## Development Workflow

1. **Understand the task** and read relevant code
2. **Write tests first** for new functionality
3. **Implement the feature** with proper error handling
4. **Run tests** and ensure coverage requirements
5. **Update documentation** if needed
6. **Commit with descriptive message**

Remember: **Quality over speed**. Take time to write clean, well-tested code that follows these guidelines.