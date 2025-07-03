# Contributing to WorkoverHub Connect

Thank you for your interest in contributing to WorkoverHub Connect! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git for version control
- Basic understanding of React, TypeScript, and Supabase

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/workoverhub-connect.git
   cd workoverhub-connect
   npm install
   ```

2. **Development Environment**
   ```bash
   npm run dev  # Start development server on localhost:5173
   ```

3. **Build and Test**
   ```bash
   npm run build     # Production build
   npm run test      # Run test suite
   npm run lint      # ESLint checking
   ```

## 📋 Development Guidelines

### Code Standards

#### TypeScript
- **Strict Mode**: All code must compile with `strict: true`
- **Type Safety**: Avoid `any` types, use proper type annotations
- **Interfaces**: Define clear interfaces for component props and data structures

```typescript
// ✅ Good
interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
}

// ❌ Avoid
const userData: any = response.data;
```

#### Component Structure
- **Functional Components**: Use React functional components with hooks
- **Props Interface**: Always define props interface for components
- **Default Exports**: Use default exports for components

```typescript
// ✅ Good Component Structure
interface UserCardProps {
  user: UserProfile;
  onEdit: (id: string) => void;
  className?: string;
}

const UserCard: React.FC<UserCardProps> = ({ user, onEdit, className }) => {
  return (
    <Card className={cn("p-4", className)}>
      {/* Component content */}
    </Card>
  );
};

export default UserCard;
```

#### Styling Guidelines
- **Design System**: Use semantic tokens from `index.css` and `tailwind.config.ts`
- **No Direct Colors**: Always use CSS custom properties, never hardcoded colors
- **Responsive Design**: Mobile-first approach with Tailwind breakpoints

```typescript
// ✅ Good - Using design system
<Button variant="primary" className="bg-primary text-primary-foreground">

// ❌ Avoid - Direct colors
<Button className="bg-blue-500 text-white">
```

### File Organization

#### Directory Structure
```
src/
├── components/
│   ├── ui/              # Base shadcn components
│   ├── feature/         # Feature-specific components
│   └── shared/          # Reusable cross-feature components
├── hooks/               # Custom React hooks
├── lib/                 # Utility functions
├── pages/               # Route components
├── types/               # TypeScript definitions
└── integrations/        # External service integrations
```

#### Naming Conventions
- **Components**: PascalCase (`UserProfile.tsx`)
- **Hooks**: camelCase with "use" prefix (`useUserData.ts`)
- **Utilities**: camelCase (`formatDate.ts`)
- **Types**: PascalCase interfaces (`UserProfile`, `BookingStatus`)

### Git Workflow

#### Branch Naming
- **Features**: `feature/user-profile-enhancement`
- **Bug Fixes**: `fix/booking-date-validation`
- **Hotfixes**: `hotfix/payment-processing-error`

#### Commit Messages
Follow the conventional commits format:

```
type(scope): description

Examples:
feat(auth): add password reset functionality
fix(booking): resolve date validation issue
docs(readme): update installation instructions
style(ui): improve button hover states
refactor(hooks): optimize user data fetching
```

#### Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   git push origin feature/your-feature-name
   ```

2. **Make Changes**
   - Write code following guidelines
   - Add/update tests as needed
   - Update documentation if required

3. **Pre-submission Checklist**
   - [ ] Code compiles without TypeScript errors
   - [ ] All tests pass: `npm run test`
   - [ ] ESLint passes: `npm run lint`
   - [ ] Build succeeds: `npm run build`
   - [ ] Manual testing completed

4. **Submit Pull Request**
   - Clear title and description
   - Reference related issues
   - Include screenshots for UI changes
   - Request appropriate reviewers

## 🧪 Testing Guidelines

### Testing Strategy
- **Unit Tests**: For utility functions and hooks
- **Component Tests**: For isolated component behavior
- **Integration Tests**: For feature workflows
- **E2E Tests**: For critical user journeys

### Writing Tests
```typescript
// Example unit test
import { formatCurrency } from '@/lib/utils';

describe('formatCurrency', () => {
  it('should format EUR currency correctly', () => {
    expect(formatCurrency(1234.56, 'EUR')).toBe('€1,234.56');
  });
});

// Example component test
import { render, screen } from '@testing-library/react';
import UserCard from './UserCard';

describe('UserCard', () => {
  it('should display user information', () => {
    const user = { id: '1', firstName: 'John', lastName: 'Doe' };
    render(<UserCard user={user} onEdit={() => {}} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
```

## 📚 Documentation

### Code Documentation
- **JSDoc Comments**: For all public functions and complex logic
- **README Updates**: When adding new features or changing setup
- **Component Documentation**: Props and usage examples

```typescript
/**
 * Formats a date string for display in the UI
 * @param date - ISO date string or Date object
 * @param format - Display format ('short' | 'long' | 'relative')
 * @returns Formatted date string
 * @example
 * formatDate('2024-01-15', 'short') // Returns: "Jan 15, 2024"
 */
export const formatDate = (date: string | Date, format: 'short' | 'long' | 'relative'): string => {
  // Implementation
};
```

## 🐛 Bug Reports

### Before Reporting
1. Check existing issues to avoid duplicates
2. Ensure you're using the latest version
3. Try to reproduce the issue consistently

### Bug Report Template
```markdown
**Description**
Clear description of the bug

**Steps to Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Environment**
- Browser: [e.g., Chrome 91]
- OS: [e.g., macOS 12]
- Version: [e.g., 1.2.3]
```

## 💡 Feature Requests

### Feature Request Template
```markdown
**Problem Statement**
What problem does this solve?

**Proposed Solution**
Detailed description of the feature

**Alternatives Considered**
Other solutions you've considered

**Additional Context**
Screenshots, mockups, examples
```

## 🔒 Security

### Security Guidelines
- Never commit sensitive information (API keys, passwords)
- Use environment variables for configuration
- Follow OWASP security best practices
- Report security vulnerabilities privately

### Reporting Security Issues
Email security concerns to: security@workoverhub.com

## 📞 Getting Help

### Communication Channels
- **GitHub Issues**: Bug reports and feature requests
- **Discord**: Real-time discussions and community support
- **Documentation**: Comprehensive guides and API references

### Code Review Process
1. **Automated Checks**: CI/CD pipeline runs tests and linting
2. **Peer Review**: At least one team member review required
3. **Design Review**: UI/UX changes require design team approval
4. **Security Review**: Security-sensitive changes require security team review

## 🎉 Recognition

Contributors will be recognized in:
- Project README contributors section
- Release notes for significant contributions
- Annual contributor appreciation events

---

Thank you for contributing to WorkoverHub Connect! Your efforts help build a better platform for the coworking community. 🚀