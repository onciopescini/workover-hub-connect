# WorkOver - Workspace Booking Platform

A modern, full-stack workspace booking platform built with React, TypeScript, and Supabase. Connect coworkers with flexible workspaces for productive remote work.

## 🚀 Quick Start

### Prerequisites

- **Node.js**: 18.x or higher
- **npm**: 9.x or higher (or yarn/pnpm)
- **Supabase Account**: For backend services

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd workover-app

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (shadcn/ui)
│   ├── auth/           # Authentication components
│   ├── booking/        # Booking flow components
│   ├── spaces/         # Space management components
│   ├── admin/          # Admin dashboard components
│   └── monitoring/     # SRE & performance monitoring
├── hooks/              # Custom React hooks
│   ├── auth/           # Authentication hooks
│   ├── booking/        # Booking-related hooks
│   └── spaces/         # Space management hooks
├── lib/                # Utility functions and services
│   ├── auth/           # Authentication utilities
│   ├── booking/        # Booking business logic
│   ├── logger.ts       # Structured logging system
│   └── supabase/       # Database utilities
├── pages/              # Application pages/routes
├── types/              # TypeScript type definitions
├── config/             # Centralized configuration
│   └── app.config.ts   # App configuration
├── constants/          # Application constants
│   └── index.ts        # Business rules, time constants
└── utils/              # Helper functions
```

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run preview          # Preview production build

# Code Quality
npm run lint             # Lint code with ESLint
npm run type-check       # TypeScript type checking

# Testing
npm run test             # Run unit tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage
npm run test:e2e         # Run E2E tests with Playwright
npm run test:e2e:ui      # Run E2E tests in interactive mode

# Database
npm run migrate          # Run database migrations
npm run migrate:status   # Check migration status
```

### Development Workflow

1. **Create a new branch** for your feature
2. **Make changes** and test locally
3. **Run linting**: `npm run lint`
4. **Run type checks**: `npm run type-check`
5. **Run tests**: `npm test`
6. **Commit changes** following conventional commits
7. **Push and create PR**

## 🧾 Modulo Fiscale (Compliance Italiana)

WorkOver supporta **compliance fiscale italiana** per host e coworker:

### Features
- ✅ Ricevute non fiscali per host privati
- ✅ Fatture elettroniche XML per host P.IVA
- ✅ Regime forfettario e ordinario
- ✅ Note di credito automatiche post-cancellazione
- ✅ Dashboard fatture pending con countdown T+7
- ✅ Archivio documenti per coworker
- ✅ Export CSV per commercialisti

### Documentazione
- [Documentazione Tecnica](./docs/FISCAL_MODULE.md)
- [Guida Utente](./docs/FISCAL_USER_GUIDE.md)
- [Guida Admin](./docs/FISCAL_ADMIN_GUIDE.md)
- [Test E2E](./tests/e2e/fiscal/)

### Quick Start
```bash
# Run fiscal E2E tests
npx playwright test tests/e2e/fiscal
```

---

## 🔧 Key Technologies

### Frontend
- **React 18**: UI framework
- **TypeScript**: Type safety
- **Tailwind CSS**: Utility-first styling
- **Radix UI**: Accessible component primitives
- **shadcn/ui**: Pre-built component library
- **Framer Motion**: Animations
- **React Query**: Server state management
- **React Router**: Client-side routing

### Backend
- **Supabase**: PostgreSQL database, authentication, storage
- **Edge Functions**: Serverless backend logic
- **Row Level Security**: Fine-grained access control

### Developer Tools
- **Vite**: Fast build tool
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Jest**: Unit testing
- **Playwright**: E2E testing

### Monitoring & Analytics
- **Sentry**: Error tracking
- **Custom SRE Dashboard**: Performance metrics
- **Plausible**: Privacy-first analytics

## 🏢 Core Features

### For Coworkers (Guests)
- 🔍 **Browse & Search**: Find workspaces by location, amenities, and price
- 📅 **Real-time Booking**: Instant or request-based booking with conflict resolution
- 💳 **Secure Payments**: Stripe integration with VAT handling
- ⭐ **Reviews & Ratings**: Rate your workspace experience
- 💬 **Direct Messaging**: Communicate with hosts
- 🤝 **Networking**: Connect with other coworkers

### For Hosts
- 📝 **Space Management**: Create and manage workspace listings
- 📊 **Analytics Dashboard**: Track bookings, revenue, and performance
- 💰 **Revenue Tracking**: Monitor earnings and payouts
- 📅 **Availability Management**: Set custom availability schedules
- 📧 **Guest Communication**: Built-in messaging system
- 🔔 **Notifications**: Real-time booking updates

### For Admins
- 🛡️ **Content Moderation**: Approve spaces and handle reports
- 👥 **User Management**: Suspend/reactivate users
- 📊 **SRE Dashboard**: Monitor system health and performance
- 🔐 **GDPR Compliance**: Data export and deletion tools
- 📈 **Platform Analytics**: Business intelligence and metrics

## 🔐 Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Supabase Configuration (Required)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key

# Feature Flags (Optional)
VITE_BOOKING_TWO_STEP=true
VITE_ENABLE_STRIPE_TAX=false
VITE_ENABLE_NETWORKING=true

# External Services (Optional)
VITE_MAPBOX_ACCESS_TOKEN=your-mapbox-token
VITE_STRIPE_PUBLISHABLE_KEY=your-stripe-key
VITE_SENTRY_DSN=your-sentry-dsn
VITE_POSTHOG_KEY=your-posthog-key

# Analytics (Optional)
VITE_PLAUSIBLE_DOMAIN=workover.app

# Performance Tuning (Optional)
VITE_CACHE_TIMEOUT=300000
VITE_RETRY_ATTEMPTS=3
VITE_LOG_BUFFER_SIZE=50
```

## 🚦 Testing

### Unit Tests

```bash
npm run test              # Run all tests
npm run test:watch        # Watch mode for TDD
npm run test:coverage     # Generate coverage report
```

### E2E Tests

```bash
npm run test:e2e          # Run all E2E tests
npm run test:e2e:ui       # Interactive mode with Playwright UI
npm run test:smoke        # Run smoke tests only
npm run test:post-deploy  # Run post-deployment tests
```

### Test Structure

```
src/
├── __tests__/          # Unit tests
│   ├── components/     # Component tests
│   ├── hooks/          # Hook tests
│   └── utils/          # Utility tests
└── e2e/                # E2E tests
    ├── auth.spec.ts
    ├── booking.spec.ts
    └── spaces.spec.ts
```

## 📊 Monitoring & Performance

### SRE Dashboard

Access the admin SRE dashboard at `/admin/sre` to monitor:

- **API Latency**: P50, P95, P99 percentiles
- **Error Rates**: Real-time error tracking
- **Active Sessions**: Current user activity
- **Database Performance**: Query performance metrics
- **Memory Usage**: Client-side memory monitoring

### Performance Metrics

The application automatically tracks:
- **Core Web Vitals**: LCP, FID, CLS
- **Component Render Times**: Performance bottleneck detection
- **API Response Times**: Backend latency monitoring
- **Error Rates**: Application stability metrics

### Error Tracking

Integrated with Sentry for:
- Real-time error reporting
- Stack trace analysis
- User session replay
- Performance monitoring

## 🔒 Security & Compliance

### GDPR Compliance
- User data export functionality
- Right to be forgotten (data deletion)
- Cookie consent management
- Privacy-first analytics

### Security Features
- Row Level Security (RLS) policies
- Secure authentication with Supabase Auth
- XSS protection
- CSRF protection
- Rate limiting on sensitive endpoints

### DAC7 Compliance
- Automatic income threshold tracking
- Host reporting for tax compliance
- Transaction history

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**
4. **Run tests**: `npm test`
5. **Run linting**: `npm run lint`
6. **Commit**: `git commit -m 'feat: add amazing feature'`
7. **Push**: `git push origin feature/amazing-feature`
8. **Open a Pull Request**

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new booking feature
fix: resolve date picker bug
docs: update README
style: format code with prettier
refactor: simplify booking logic
test: add unit tests for auth
chore: update dependencies
```

## 📝 Code Quality Standards

- **ESLint**: Enforced code style and best practices
- **Prettier**: Consistent code formatting
- **TypeScript**: Strict type checking enabled
- **Test Coverage**: Target 80%+ coverage
- **Component Size**: Max 100 lines per function
- **Complexity**: Max cyclomatic complexity of 15

## 🐛 Troubleshooting

### Common Issues

**Development server won't start**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Type errors after pulling changes**
```bash
# Regenerate Supabase types
npm run type-check
```

**Database connection issues**
- Verify Supabase credentials in `.env.local`
- Check Supabase project status
- Ensure RLS policies are configured

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Supabase](https://supabase.com) - Backend infrastructure
- [shadcn/ui](https://ui.shadcn.com) - UI components
- [Radix UI](https://www.radix-ui.com) - Accessible primitives
- [Tailwind CSS](https://tailwindcss.com) - Styling framework

## 📞 Support

For support, email support@workover.app or join our Discord community.

---

Built with ❤️ by the WorkOver team
